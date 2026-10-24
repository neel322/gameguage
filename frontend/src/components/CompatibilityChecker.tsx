import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Game, UserRigSpecs, UserProfile } from '../types';
import { LAPTOPS, LAPTOP_BRANDS, getLaptopsByBrand } from '../data/laptops';
import { CPUS, GPUS } from '../data/hardware';
import { storageService } from '../services/storage';
import { externalGameService } from '../services/gameapi';

interface CompatibilityCheckerProps {
  initialGameId?: string;
  onNavigateToLaptopCompare?: () => void;
  onNavigateToPCBuilder?: () => void;
  userProfile?: UserProfile | null;
  games?: Game[];
  activeRig?: UserRigSpecs | null;
  initialStep?: 'game' | 'specs' | 'verdict';
  preselectedGame?: Game | null;
}

interface FpsEstimates {
  low: number;
  medium: number;
  high: number;
  ultra: number;
}

interface CompatibilityResult {
  canRun: boolean;
  verdict: string;
  overallScore: number;
  estimatedFps: number;
  fpsEstimates: FpsEstimates;
  meetsMinimum: boolean;
  meetsRecommended: boolean;
}

interface BottleneckResult {
  bottleneckPercentage: number;
  limitingComponent: string;
  explanation: string;
}

const getMinGpuLabel = (g: Game): string =>
  (g as Record<string, any>).minGpu ||
  (g as Record<string, any>).minGpuName ||
  (g as Record<string, any>).minimumGpu ||
  (g as any).minimumRequirements?.gpu ||
  (g as any).minimum?.gpuName ||
  'GTX 1060 6GB';

const getRecGpuLabel = (g: Game): string =>
  (g as Record<string, any>).recGpu ||
  (g as Record<string, any>).recGpuName ||
  (g as Record<string, any>).recommendedGpu ||
  (g as any).recommended?.gpuName ||
  'RTX 2060 Super 6GB';

const getRecCpuLabel = (g: Game): string =>
  (g as Record<string, any>).recCpu ||
  (g as Record<string, any>).recCpuName ||
  (g as Record<string, any>).recommendedCpu ||
  (g as any).minimumRequirements?.cpu ||
  (g as any).recommended?.cpuName ||
  'Intel Core i7-6700';

const getRecRamLabel = (g: Game): number => {
  const ramVal =
    (g as Record<string, any>).recRamGb ||
    (g as Record<string, any>).recRam ||
    (g as Record<string, any>).recommendedRam ||
    (g as any).recommended?.ramGb;

  if (ramVal) return Number(ramVal);
  if ((g as any).minimumRequirements?.ram) {
    const parsed = parseInt((g as any).minimumRequirements.ram, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 16;
};

const getRecGpuScore = (g: Game): number =>
  (g as Record<string, any>).recGpuScore ||
  (g as Record<string, any>).recommendedGpuScore ||
  (g as any).recommended?.gpuScore ||
  12000;

const getRecCpuScore = (g: Game): number =>
  (g as Record<string, any>).recCpuScore ||
  (g as Record<string, any>).recommendedCpuScore ||
  (g as any).recommended?.cpuScore ||
  14000;

function computeCompatibility(
  game: Game,
  rig: UserRigSpecs,
  res: '1080p' | '1440p' | '4K'
): CompatibilityResult {
  const resScale = res === '1080p' ? 1.0 : res === '1440p' ? 0.72 : 0.45;
  const laptopScale = rig.isLaptop ? 0.88 : 1.0;

  const targetGpuScore = getRecGpuScore(game);
  const targetCpuScore = getRecCpuScore(game);

  const gpuRelative = Math.min(2.0, Math.max(0.3, rig.gpuScore / targetGpuScore));
  const cpuRelative = Math.min(1.8, Math.max(0.4, rig.cpuScore / targetCpuScore));
  const ramFactor = Math.min(1.15, Math.max(0.6, rig.ramGb / getRecRamLabel(game)));

  const baseFps = Math.round(58 * gpuRelative * 0.65 + 58 * cpuRelative * 0.25 + 58 * ramFactor * 0.1);
  const targetFps = Math.max(15, Math.round(baseFps * resScale * laptopScale));
  const overallScore = Math.min(100, Math.max(20, Math.round((targetFps / 60) * 65)));
  const canRun = targetFps >= 30;

  let verdict = 'Playable at 1080p Medium Preset';
  if (targetFps >= 75) verdict = 'Ultra Smooth Esports / AAA Experience';
  else if (targetFps >= 55) verdict = 'Great to Play (Smooth Experience)';
  else if (targetFps >= 40) verdict = 'Playable with Scaled / Low Settings';
  else verdict = 'Hardware Upgrade Advised';

  return {
    canRun,
    verdict,
    overallScore,
    estimatedFps: targetFps,
    fpsEstimates: {
      low: Math.round(targetFps * 1.35),
      medium: Math.round(targetFps * 1.12),
      high: targetFps,
      ultra: Math.max(12, Math.round(targetFps * 0.78)),
    },
    meetsMinimum: targetFps >= 30,
    meetsRecommended: targetFps >= 55,
  };
}

function computeBottleneck(rig: UserRigSpecs): BottleneckResult {
  const ratio = (rig.cpuScore / Math.max(1, rig.gpuScore)) * 0.85;

  if (ratio > 1.35) {
    const pct = Math.min(38, Math.round((ratio - 1) * 24));
    return {
      bottleneckPercentage: pct,
      limitingComponent: 'GPU Bound',
      explanation: 'Your GPU is underpowered compared to your CPU throughput at high resolutions.',
    };
  }

  if (ratio < 0.68) {
    const pct = Math.min(42, Math.round((1 - ratio) * 32));
    return {
      bottleneckPercentage: pct,
      limitingComponent: 'CPU Bound',
      explanation: 'Your CPU may throttle high frame rates in geometry-heavy scenes.',
    };
  }

  return {
    bottleneckPercentage: 4,
    limitingComponent: 'Balanced Rig',
    explanation: 'Minimal CPU/GPU mismatch. Zero catastrophic throttle points detected.',
  };
}

export const CompatibilityChecker: React.FC<CompatibilityCheckerProps> = ({
  initialGameId,
  onNavigateToLaptopCompare,
  onNavigateToPCBuilder,
  userProfile,
  games: initialGamesProp = [],
  activeRig = null,
  initialStep,
  preselectedGame = null,
}) => {
  const resolvedRig = useMemo(() => activeRig || userProfile?.defaultRig || null, [activeRig, userProfile]);

  const [step, setStep] = useState<'game' | 'specs' | 'verdict'>(() => {
    if (initialStep) return initialStep;
    if (preselectedGame || initialGameId) return 'specs';
    return 'game';
  });

  const [selectedGame, setSelectedGame] = useState<Game | null>(() => {
    if (preselectedGame) return preselectedGame;
    return null;
  });

  // Dynamic live game states
  const [baseGamesPool, setBaseGamesPool] = useState<Game[]>(initialGamesProp);
  const [onlineGames, setOnlineGames] = useState<Game[]>(initialGamesProp);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [gameSearch, setGameSearch] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [targetResolution, setTargetResolution] = useState<'1080p' | '1440p' | '4K'>('1080p');
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Scroll marker ref placed right above the search box
  const searchMarkerRef = useRef<HTMLDivElement | null>(null);

  // Monitor scroll for the bottom-left floating up-arrow
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSearch = () => {
    if (searchMarkerRef.current) {
      searchMarkerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Load online catalog on mount
  useEffect(() => {
    let isMounted = true;
    async function loadGames() {
      setIsLoadingGames(true);
      const fetched = await externalGameService.fetchFreeToPlayGames();
      if (isMounted) {
        setBaseGamesPool(fetched);
        setOnlineGames(fetched);
        setIsLoadingGames(false);
      }
    }
    loadGames();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced search with synonym mapping (PUBG <-> Battlegrounds) & CheapShark query
  useEffect(() => {
    const q = gameSearch.trim().toLowerCase();

    if (!q) {
      setOnlineGames(baseGamesPool);
      setIsLoadingGames(false);
      return;
    }

    setIsLoadingGames(true);
    let isCurrent = true;

    const timer = setTimeout(async () => {
      // 1. Instant local matching across loaded base games
      const localMatches = baseGamesPool.filter((g) => {
        const titleLower = g.title.toLowerCase();
        if (titleLower.includes(q)) return true;
        if ((q === 'pubg' || q.includes('pubg')) && titleLower.includes('battlegrounds')) return true;
        if ((q === 'battlegrounds' || q.includes('battleground')) && titleLower.includes('pubg')) return true;
        return false;
      });

      // 2. Fetch external CheapShark results if user typed 3+ chars
      let remoteMatches: Game[] = [];
      if (q.length >= 3) {
        remoteMatches = await externalGameService.searchCheapShark(q);
      }

      if (!isCurrent) return;

      // Deduplicate by title
      const seenTitles = new Set<string>();
      const combined: Game[] = [];

      for (const item of [...localMatches, ...remoteMatches]) {
        const key = item.title.toLowerCase().trim();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          combined.push(item);
        }
      }

      setOnlineGames(combined);
      setIsLoadingGames(false);
    }, 280);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [gameSearch, baseGamesPool]);

  const activeGamesList = onlineGames;

  const [deviceType, setDeviceType] = useState<'laptop' | 'desktop'>(() => {
    if (resolvedRig) return resolvedRig.isLaptop ? 'laptop' : 'desktop';
    return 'laptop';
  });

  const [selectedLaptopBrand, setSelectedLaptopBrand] = useState<string>(LAPTOP_BRANDS[0] || 'Lenovo');
  const [selectedLaptopId, setSelectedLaptopId] = useState<string>(() => {
    const list = getLaptopsByBrand(LAPTOP_BRANDS[0] || 'Lenovo');
    return list[0]?.id || LAPTOPS[0]?.id || '';
  });

  const currentSelectedLaptop = useMemo(() => {
    return LAPTOPS.find((l) => l.id === selectedLaptopId) || LAPTOPS[0];
  }, [selectedLaptopId]);

  const desktopCpus = useMemo(() => CPUS.filter((c) => c.platform === 'desktop'), []);
  const desktopGpus = useMemo(() => GPUS.filter((g) => g.platform === 'desktop'), []);

  const [selectedCpuId, setSelectedCpuId] = useState<string>(desktopCpus[0]?.id || 'cpu-r5-5600');
  const [selectedGpuId, setSelectedGpuId] = useState<string>(desktopGpus[0]?.id || 'gpu-rx-6600');
  const [selectedRamGb, setSelectedRamGb] = useState<number>(16);

  const currentSelectedCpu = useMemo(() => {
    return desktopCpus.find((c) => c.id === selectedCpuId) || desktopCpus[0];
  }, [desktopCpus, selectedCpuId]);

  const currentSelectedGpu = useMemo(() => {
    return desktopGpus.find((g) => g.id === selectedGpuId) || desktopGpus[0];
  }, [desktopGpus, selectedGpuId]);

  useEffect(() => {
    if (initialGameId && activeGamesList.length > 0) {
      const match = activeGamesList.find((g) => g.id === initialGameId);
      if (match) {
        setSelectedGame(match);
        setStep('specs');
      }
    } else if (preselectedGame) {
      setSelectedGame(preselectedGame);
      setStep('specs');
    }
  }, [initialGameId, preselectedGame, activeGamesList]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    activeGamesList.forEach((g) => {
      if (Array.isArray(g.genres)) {
        g.genres.forEach((item: string) => set.add(item));
      }
    });
    return ['All', ...Array.from(set)];
  }, [activeGamesList]);

  const filteredBrowserGames = useMemo(() => {
    return activeGamesList.filter((game) => {
      const matchesGenre =
        selectedGenre === 'All' ||
        (Array.isArray(game.genres) && game.genres.includes(selectedGenre));
      return matchesGenre;
    });
  }, [activeGamesList, selectedGenre]);

  const currentRigSpecs: UserRigSpecs = useMemo(() => {
    if (deviceType === 'laptop') {
      return {
        isLaptop: true,
        cpuName: currentSelectedLaptop.cpuName,
        cpuScore: currentSelectedLaptop.cpuScore,
        gpuName: currentSelectedLaptop.gpuName,
        gpuScore: currentSelectedLaptop.gpuScore,
        vramGb: currentSelectedLaptop.vramGb,
        ramGb: currentSelectedLaptop.ramGb,
        storageGb: 512,
        isSsd: true,
      };
    }

    return {
      isLaptop: false,
      cpuName: currentSelectedCpu.name,
      cpuScore: currentSelectedCpu.score,
      gpuName: currentSelectedGpu.name,
      gpuScore: currentSelectedGpu.score,
      vramGb: currentSelectedGpu.vramGb || 8,
      ramGb: selectedRamGb,
      storageGb: 1000,
      isSsd: true,
    };
  }, [deviceType, currentSelectedLaptop, currentSelectedCpu, currentSelectedGpu, selectedRamGb]);

  const compatibility = useMemo(() => {
    if (!selectedGame) return null;
    return computeCompatibility(selectedGame, currentRigSpecs, targetResolution);
  }, [selectedGame, currentRigSpecs, targetResolution]);

  const bottleneck = useMemo(() => {
    return computeBottleneck(currentRigSpecs);
  }, [currentRigSpecs]);

  // Log results to database table whenever a verdict is reached
  useEffect(() => {
    if (step === 'verdict' && selectedGame && compatibility) {
      storageService.logRigCheck(
        selectedGame.id,
        selectedGame.title,
        currentRigSpecs,
        compatibility.estimatedFps,
        compatibility.overallScore,
        compatibility.verdict
      );
    }
  }, [step, selectedGame, compatibility, currentRigSpecs]);

  return (
    <div className="relative flex flex-col w-full text-on-surface pb-16 md:pb-0">
      {/* Navigation Breadcrumb Steps */}
      <div className="w-full px-4 md:px-8 max-w-7xl mx-auto pt-3 md:pt-4 flex items-center justify-between border-b border-surface-container-high/40 pb-3">
        <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-label-md font-bold uppercase">
          <button
            type="button"
            className={`px-2 py-1 rounded transition-all cursor-pointer ${
              step === 'game'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container text-outline hover:text-on-surface'
            }`}
            onClick={() => setStep('game')}
          >
            1. Select
          </button>
          <span className="text-outline">/</span>
          <button
            type="button"
            className={`px-2 py-1 rounded transition-all ${
              step === 'specs'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container text-outline cursor-pointer hover:text-on-surface'
            }`}
            onClick={() => {
              if (selectedGame) setStep('specs');
            }}
          >
            2. Specs
          </button>
          <span className="text-outline">/</span>
          <span
            className={`px-2 py-1 rounded ${
              step === 'verdict'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container text-outline'
            }`}
          >
            3. Results
          </span>
        </div>

        {selectedGame && (
          <span className="text-xs text-primary font-mono truncate max-w-[140px] md:max-w-none">
            {selectedGame.title}
          </span>
        )}
      </div>

      {/* ================= STEP 1: TARGET GAME BROWSER ================= */}
      {step === 'game' && (
        <div className="w-full px-4 md:px-8 max-w-7xl mx-auto py-4 md:py-8 flex flex-col gap-4 md:gap-6">
          <div className="rounded-xl bg-surface-container-low p-4 md:p-6 border border-surface-container-high/60 shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high text-primary text-[10px] md:text-label-sm uppercase font-bold tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
              <span>Step 1: Choose Your Benchmark Target</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-on-surface tracking-tight uppercase">
              Can My Rig Run It?
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mt-1">
              Live database stream enabled. Search from over 100,000+ PC titles below.
            </p>
          </div>

          {/* Marker above search */}
          <div ref={searchMarkerRef} className="h-0 w-full" id="search-marker" />

          {/* Search Input */}
          <div className="w-full relative rounded-lg bg-surface-container-lowest flex items-center px-3.5 py-2.5 border border-surface-container-high/60 focus-within:border-primary-container transition-all">
            <span className={`material-symbols-outlined text-primary text-[20px] mr-2.5 ${isLoadingGames ? 'animate-spin' : ''}`}>
              {isLoadingGames ? 'sync' : 'search'}
            </span>
            <input
              className="w-full bg-transparent text-sm md:text-base text-on-surface placeholder:text-outline focus:outline-none"
              placeholder="Search 100,000+ PC games live (e.g. PUBG, Battlegrounds, Cyberpunk, Valorant)..."
              type="text"
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
            />
            {gameSearch && (
              <button
                type="button"
                onClick={() => setGameSearch('')}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Genre Scrollable Filter */}
          <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {genres.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high/60'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>

          {/* Games Grid */}
          {filteredBrowserGames.length === 0 && !isLoadingGames ? (
            <div className="text-center py-12 text-outline text-sm">
              No games found matching "{gameSearch}". Try another name or keyword.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 w-full">
              {filteredBrowserGames.map((game) => (
                <div
                  key={game.id}
                  onClick={() => {
                    setSelectedGame(game);
                    setStep('specs');
                  }}
                  className="group flex flex-col rounded-xl bg-surface-container-low border border-surface-container-high/50 overflow-hidden cursor-pointer hover:border-primary-container/60 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative w-full h-40 md:h-48 bg-surface-container-high overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={game.coverImage}
                      alt={game.title}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent" />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-surface-container-lowest/80 text-primary text-[10px] uppercase font-mono">
                      {game.releaseYear}
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      <h2 className="text-base md:text-lg font-bold text-on-surface uppercase truncate group-hover:text-primary transition-colors">
                        {game.title}
                      </h2>
                      <div className="grid grid-cols-2 gap-2 mt-2 p-2 rounded bg-surface-container text-xs">
                        <div>
                          <span className="text-[10px] text-outline uppercase block">Min GPU</span>
                          <span className="font-semibold text-on-surface truncate block">{getMinGpuLabel(game)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-outline uppercase block">Rec GPU</span>
                          <span className="font-semibold text-primary truncate block">{getRecGpuLabel(game)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2 rounded bg-primary-container text-on-primary-container text-xs uppercase font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Test Compatibility</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 2: CONFIGURE HARDWARE ================= */}
      {step === 'specs' && selectedGame && (
        <div className="w-full px-4 md:px-8 max-w-3xl mx-auto py-4 md:py-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('game')}
              className="inline-flex items-center gap-1 text-primary-container text-xs uppercase font-bold hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Change Target Game ({selectedGame.title})
            </button>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4 md:p-6 border border-surface-container-high/60 shadow-xl flex flex-col gap-4">
            <div>
              <h2 className="text-lg md:text-2xl font-bold uppercase text-on-surface">Step 2: Enter Rig Configuration</h2>
              <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
                Simulating performance for <strong className="text-primary-container">{selectedGame.title}</strong>
              </p>
            </div>

            {/* Device Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-surface-container-lowest border border-surface-container-high/50">
              <button
                type="button"
                onClick={() => setDeviceType('laptop')}
                className={`py-2 rounded text-xs md:text-sm uppercase font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  deviceType === 'laptop'
                    ? 'bg-surface-container-high text-primary-container shadow-sm border border-primary-container/40'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">laptop_mac</span>
                Gaming Laptop
              </button>
              <button
                type="button"
                onClick={() => setDeviceType('desktop')}
                className={`py-2 rounded text-xs md:text-sm uppercase font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  deviceType === 'desktop'
                    ? 'bg-surface-container-high text-primary-container shadow-sm border border-primary-container/40'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
                Desktop PC
              </button>
            </div>

            {/* Laptop Selection */}
            {deviceType === 'laptop' && (
              <div className="flex flex-col gap-3 bg-surface-container p-3.5 rounded-xl border border-surface-container-high/50">
                <div>
                  <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">
                    Select Laptop Brand
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {LAPTOP_BRANDS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setSelectedLaptopBrand(b);
                          const list = getLaptopsByBrand(b);
                          if (list[0]) setSelectedLaptopId(list[0].id);
                        }}
                        className={`py-1 rounded text-xs font-bold uppercase transition-all cursor-pointer border ${
                          selectedLaptopBrand === b
                            ? 'bg-primary-container text-on-primary-container border-primary-container shadow-sm'
                            : 'bg-surface-container-lowest text-on-surface border-surface-container-high/60 hover:bg-surface-container-high'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-outline uppercase mb-1">
                    Select Laptop Model
                  </label>
                  <select
                    value={selectedLaptopId}
                    onChange={(e) => setSelectedLaptopId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface text-xs md:text-sm border border-surface-container-high/60 focus:outline-none"
                  >
                    {getLaptopsByBrand(selectedLaptopBrand).map((l) => (
                      <option key={l.id} value={l.id} className="bg-surface-container-lowest text-on-surface">
                        {l.fullName} ({l.gpuName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded bg-surface-container-lowest border border-surface-container-high/40 text-xs flex flex-col gap-1">
                  <span className="text-primary font-bold uppercase text-[10px]">Model Telemetry Loaded</span>
                  <span className="text-on-surface truncate">
                    {currentSelectedLaptop.gpuName} • {currentSelectedLaptop.cpuName} • {currentSelectedLaptop.ramGb}GB RAM ({currentSelectedLaptop.tgpWatts}W TGP)
                  </span>
                </div>
              </div>
            )}

            {/* Desktop Selection */}
            {deviceType === 'desktop' && (
              <div className="flex flex-col gap-3 bg-surface-container p-3.5 rounded-xl border border-surface-container-high/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Graphics Card (GPU)</label>
                    <select
                      value={selectedGpuId}
                      onChange={(e) => setSelectedGpuId(e.target.value)}
                      className="w-full h-10 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs md:text-sm border border-surface-container-high/60 focus:outline-none"
                    >
                      {desktopGpus.map((g) => (
                        <option key={g.id} value={g.id} className="bg-surface-container-lowest text-on-surface">
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Processor (CPU)</label>
                    <select
                      value={selectedCpuId}
                      onChange={(e) => setSelectedCpuId(e.target.value)}
                      className="w-full h-10 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs md:text-sm border border-surface-container-high/60 focus:outline-none"
                    >
                      {desktopCpus.map((c) => (
                        <option key={c.id} value={c.id} className="bg-surface-container-lowest text-on-surface">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-outline uppercase mb-1">System RAM</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[8, 16, 32, 64].map((ram) => (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => setSelectedRamGb(ram)}
                        className={`py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer ${
                          selectedRamGb === ram
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container-high/50'
                        }`}
                      >
                        {ram} GB
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Resolution Selector */}
            <div>
              <label className="block text-[11px] font-bold text-outline uppercase mb-1">Target Resolution</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1080p', '1440p', '4K'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setTargetResolution(res)}
                    className={`py-2 rounded text-xs font-bold uppercase transition-all cursor-pointer ${
                      targetResolution === res
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container-high/50'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep('verdict')}
              className="mt-2 w-full py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container text-sm uppercase font-bold tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[20px]">play_arrow</span>
              <span>Run Live Telemetry Check</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: RESULTS ================= */}
      {step === 'verdict' && selectedGame && compatibility && (
        <div className="w-full px-4 md:px-8 max-w-7xl mx-auto py-4 md:py-8 flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-high/40 pb-3">
            <div>
              <button
                type="button"
                onClick={() => setStep('specs')}
                className="inline-flex items-center gap-1 text-primary-container text-xs uppercase font-bold hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Adjust Specs
              </button>
              <h1 className="text-lg md:text-2xl font-bold uppercase mt-1">
                {selectedGame.title} Telemetry Results
              </h1>
            </div>
            <span className="px-2.5 py-1 rounded bg-surface-container text-primary font-mono text-xs uppercase self-start sm:self-auto">
              {currentRigSpecs.gpuName} • {targetResolution}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Gauge Score Card */}
            <div className="lg:col-span-4 rounded-xl bg-surface-container-low p-5 border border-surface-container-high/60 shadow-xl flex flex-col items-center justify-center text-center">
              <div className="relative w-44 h-28 flex flex-col items-center justify-end">
                <svg className="w-40 h-24 overflow-visible" viewBox="0 0 160 85">
                  <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="#262a33" strokeLinecap="round" strokeWidth="14" />
                  <path
                    d="M 15 80 A 65 65 0 0 1 145 80"
                    fill="none"
                    stroke="#38bdf8"
                    strokeDasharray="204.2"
                    strokeDashoffset={Math.max(0, 204.2 - (204.2 * compatibility.overallScore) / 100)}
                    strokeLinecap="round"
                    strokeWidth="14"
                  />
                </svg>
                <span className="text-3xl font-black text-on-surface leading-none mt-1">{compatibility.overallScore}</span>
                <span className="text-[10px] uppercase font-bold text-primary-container tracking-wider">Gauge Index</span>
              </div>
              <h3 className="text-base font-bold text-on-surface mt-3">
                {compatibility.canRun ? 'Ready to Game' : 'Hardware Upgrade Recommended'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Projected average output: ~{compatibility.fpsEstimates.medium} FPS at {targetResolution}.
              </p>
            </div>

            {/* Matrix & Bottleneck Breakdown */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Presets */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60">
                <span className="text-xs font-bold uppercase text-outline block mb-2">Preset Matrix Output ({targetResolution})</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <span className="text-[10px] uppercase text-outline block">Low</span>
                    <span className="text-xl font-bold text-primary">{compatibility.fpsEstimates.low} FPS</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-high border border-primary-container/30">
                    <span className="text-[10px] uppercase text-primary-container font-semibold block">Medium</span>
                    <span className="text-xl font-bold text-primary-container">{compatibility.fpsEstimates.medium} FPS</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <span className="text-[10px] uppercase text-outline block">High</span>
                    <span className="text-xl font-bold text-on-surface">{compatibility.fpsEstimates.high} FPS</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <span className="text-[10px] uppercase text-outline block">Ultra</span>
                    <span className="text-xl font-bold text-on-surface">{compatibility.fpsEstimates.ultra} FPS</span>
                  </div>
                </div>
              </div>

              {/* Component Audit */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase text-outline block">Component Breakdown</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded bg-surface-container flex flex-col">
                    <span className="text-[10px] uppercase text-outline">Target GPU</span>
                    <span className="text-xs font-bold text-on-surface truncate">{getRecGpuLabel(selectedGame)}</span>
                    <span className="text-[10px] text-primary truncate mt-0.5">Your: {currentRigSpecs.gpuName}</span>
                  </div>
                  <div className="p-2.5 rounded bg-surface-container flex flex-col">
                    <span className="text-[10px] uppercase text-outline">Target CPU</span>
                    <span className="text-xs font-bold text-on-surface truncate">{getRecCpuLabel(selectedGame)}</span>
                    <span className="text-[10px] text-primary truncate mt-0.5">Your: {currentRigSpecs.cpuName}</span>
                  </div>
                  <div className="p-2.5 rounded bg-surface-container flex flex-col">
                    <span className="text-[10px] uppercase text-outline">Target RAM</span>
                    <span className="text-xs font-bold text-on-surface truncate">{getRecRamLabel(selectedGame)} GB</span>
                    <span className="text-[10px] text-primary truncate mt-0.5">Your: {currentRigSpecs.ramGb} GB</span>
                  </div>
                </div>
              </div>

              {/* Bottleneck Warning / Advisory */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-on-surface uppercase">Bottleneck Audit</span>
                  <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary-container text-xs font-bold uppercase">
                    {bottleneck.bottleneckPercentage}% ({bottleneck.limitingComponent})
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{bottleneck.explanation}</p>
              </div>

              {/* Cross-navigation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {onNavigateToLaptopCompare && (
                  <button
                    type="button"
                    onClick={onNavigateToLaptopCompare}
                    className="p-3 rounded-lg bg-surface-container-low border border-surface-container-high/60 hover:bg-surface-container text-left flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-on-surface block uppercase">Compare Laptop Models</span>
                      <span className="text-[11px] text-on-surface-variant">See laptops for {selectedGame.title}</span>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[18px]">arrow_forward</span>
                  </button>
                )}

                {onNavigateToPCBuilder && (
                  <button
                    type="button"
                    onClick={onNavigateToPCBuilder}
                    className="p-3 rounded-lg bg-surface-container-low border border-surface-container-high/60 hover:bg-surface-container text-left flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-on-surface block uppercase">Custom PC Builder</span>
                      <span className="text-[11px] text-on-surface-variant">Configure components in INR</span>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[18px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING UP-ARROW BUTTON (BOTTOM-LEFT ON MOBILE & LAPTOP) --- */}
      {showScrollTop && step === 'game' && (
        <button
          type="button"
          onClick={scrollToSearch}
          aria-label="Scroll to search marker"
          className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-primary-container text-on-primary-container shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-primary/40 backdrop-blur-md"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_upward</span>
        </button>
      )}
    </div>
  );
};

export default CompatibilityChecker;
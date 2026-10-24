import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Game, LaptopModel, UserProfile } from '../types';
import { externalGameService } from '../services/gameapi';
import { LAPTOPS, LAPTOP_BRANDS, getLaptopsByBrand } from '../data/laptops';
import { CPUS, GPUS } from '../data/hardware';
import { evaluateCompatibility } from '../utils/engine';
import { formatINR } from '../utils/currency';

interface LaptopComparisonProps {
  userProfile?: UserProfile | null;
}

const getUserLaptopModel = (profile?: UserProfile | null): LaptopModel | null => {
  if (!profile?.defaultRig?.isLaptop) return null;
  const rig = profile.defaultRig;
  const brand = (rig.laptopBrand as any) || 'Lenovo';
  const modelTitle = profile.rigName || rig.laptopModelId || 'Your Current Laptop';
  return {
    id: 'user_active_laptop',
    brand,
    modelName: modelTitle,
    fullName: `${modelTitle} (Your Rig)`,
    series: 'Personal Rig',
    priceUsd: 0,
    cpuName: rig.cpuName,
    cpuScore: rig.cpuScore,
    gpuName: rig.gpuName,
    gpuScore: rig.gpuScore,
    vramGb: rig.vramGb,
    ramGb: rig.ramGb,
    storage: `${rig.storageGb}GB ${rig.isSsd ? 'SSD' : 'HDD'}`,
    display: '1080p 144Hz (Your Laptop)',
    tgpWatts: 85,
  };
};

export const LaptopComparison: React.FC<LaptopComparisonProps> = ({ userProfile }) => {
  const [gamesList, setGamesList] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const [gameSearchQuery, setGameSearchQuery] = useState<string>('');
  const [isGameSelectorOpen, setIsGameSelectorOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [comparedLaptops, setComparedLaptops] = useState<LaptopModel[]>(() => {
    const userLaptop = getUserLaptopModel(userProfile);
    return userLaptop ? [userLaptop] : [];
  });

  // Fetch live games on mount
  useEffect(() => {
    let isMounted = true;
    externalGameService.fetchFreeToPlayGames().then((data) => {
      if (isMounted && data.length > 0) {
        setGamesList(data);
        setSelectedGame(data[0]); // Defaults to the first game once loaded
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const userLaptop = getUserLaptopModel(userProfile);
    if (userLaptop) {
      setComparedLaptops(prev => {
        const withoutOld = prev.filter(l => l.id !== 'user_active_laptop');
        return [userLaptop, ...withoutOld].slice(0, 4);
      });
    } else {
      setComparedLaptops(prev => prev.filter(l => l.id !== 'user_active_laptop'));
    }
  }, [userProfile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsGameSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'catalog' | 'manual'>('catalog');

  const [catalogBrand, setCatalogBrand] = useState<string>('Lenovo');
  const [catalogLaptopId, setCatalogLaptopId] = useState<string>(
    getLaptopsByBrand('Lenovo')[0]?.id || ''
  );

  const [customBrand, setCustomBrand] = useState<string>('ASUS');
  const [customModelName, setCustomModelName] = useState<string>('ROG Strix G16 (Custom)');
  const [customPriceInr, setCustomPriceInr] = useState<number>(99990);
  const [customCpuName, setCustomCpuName] = useState<string>('Intel Core i7-13700H (Laptop)');
  const [customGpuName, setCustomGpuName] = useState<string>('NVIDIA RTX 4060 Mobile (Laptop)');
  const [customRamGb, setCustomRamGb] = useState<number>(16);
  const [customVramGb, setCustomVramGb] = useState<number>(8);
  const [customDisplay, setCustomDisplay] = useState<string>('16" FHD 165Hz IPS');
  const [customTgp, setCustomTgp] = useState<number>(115);

  const searchedGames = useMemo(() => {
    return gamesList.filter((g: Game) =>
      g.title.toLowerCase().includes(gameSearchQuery.toLowerCase()) ||
      (Array.isArray(g.genres) && g.genres.some((gen: string) => gen.toLowerCase().includes(gameSearchQuery.toLowerCase())))
    );
  }, [gamesList, gameSearchQuery]);

  const handleAddFromCatalog = () => {
    const found = LAPTOPS.find(l => l.id === catalogLaptopId);
    if (!found) return;

    if (!comparedLaptops.some(l => l.id === found.id)) {
      if (comparedLaptops.length >= 4) {
        setComparedLaptops([...comparedLaptops.slice(1), found]);
      } else {
        setComparedLaptops([...comparedLaptops, found]);
      }
    }
    setIsAddModalOpen(false);
  };

  const handleAddManualLaptop = () => {
    if (!customModelName.trim()) return;

    const matchedCpu = CPUS.find(c => c.name === customCpuName);
    const matchedGpu = GPUS.find(g => g.name === customGpuName);

    const manualLaptop: LaptopModel = {
      id: 'custom_laptop_' + Date.now(),
      brand: customBrand as any,
      modelName: customModelName,
      fullName: `${customBrand} ${customModelName}`,
      series: 'Custom',
      priceUsd: Math.round(customPriceInr / 83),
      cpuName: customCpuName,
      cpuScore: matchedCpu ? matchedCpu.score : 14000,
      gpuName: customGpuName,
      gpuScore: matchedGpu ? matchedGpu.score : 9000,
      vramGb: customVramGb,
      ramGb: customRamGb,
      storage: '512GB NVMe SSD',
      display: customDisplay,
      tgpWatts: customTgp,
    };

    if (comparedLaptops.length >= 4) {
      setComparedLaptops([...comparedLaptops.slice(1), manualLaptop]);
    } else {
      setComparedLaptops([...comparedLaptops, manualLaptop]);
    }

    setIsAddModalOpen(false);
  };

  const handleRemoveLaptop = (id: string) => {
    setComparedLaptops(comparedLaptops.filter(l => l.id !== id));
  };

  const comparisonResults = useMemo(() => {
    if (!selectedGame) return [];

    return comparedLaptops.map(laptop => {
      const report = evaluateCompatibility(selectedGame, {
        isLaptop: true,
        laptopBrand: laptop.brand,
        laptopModelId: laptop.id,
        cpuName: laptop.cpuName,
        cpuScore: laptop.cpuScore,
        gpuName: laptop.gpuName,
        gpuScore: laptop.gpuScore,
        ramGb: laptop.ramGb,
        vramGb: laptop.vramGb,
        storageGb: 512,
        isSsd: true,
      });

      const priceInr = laptop.priceUsd > 0 ? laptop.priceUsd * 83 : 0;
      const fpsPerLakh = priceInr > 0 ? Number(((report.estimatedFps.high1080p / priceInr) * 100000).toFixed(1)) : 0;

      // In-depth qualitative gameplay calculation
      const tgp = laptop.tgpWatts || 85;
      const vram = laptop.vramGb || 6;
      const fpsHigh = report.estimatedFps.high1080p;

      let gameplayVerdict = '';
      let thermalBehavior = '';
      let vramHeadroom = '';
      let displaySyncFit = '';

      if (fpsHigh >= 75) {
        gameplayVerdict = `Flawless fluid gameplay on High settings with consistent 75+ FPS. Zero frame drops in intense scenes.`;
      } else if (fpsHigh >= 55) {
        gameplayVerdict = `Smooth 60 FPS target met. Enables High settings with DLSS/FSR Quality enabled for combat headroom.`;
      } else if (fpsHigh >= 40) {
        gameplayVerdict = `Playable on Medium settings. In high-density areas, frame pacing will benefit from capping to 45 FPS.`;
      } else {
        gameplayVerdict = `Struggles to maintain 30 FPS at native resolution. Requires Low settings and performance upscaling.`;
      }

      if (tgp >= 115) {
        thermalBehavior = `High ${tgp}W TGP allows GPU to hold peak boost clocks under long gaming sessions without thermal downclocking.`;
      } else if (tgp >= 85) {
        thermalBehavior = `Balanced ${tgp}W profile: Moderate fan acoustics; maintain proper rear exhaust clearance to prevent thermal soak.`;
      } else {
        thermalBehavior = `Compact ${tgp}W limit: GPU clocks will stabilize ~10% lower after 15 minutes of heavy gameplay.`;
      }

      if (vram >= 12) {
        vramHeadroom = `12GB VRAM: Complete headroom for 1440p High textures and ray traced reflections without stutter.`;
      } else if (vram >= 8) {
        vramHeadroom = `8GB VRAM: Sweet spot for 1080p High textures. No micro-stutters or texture streaming pop-in.`;
      } else {
        vramHeadroom = `6GB VRAM: Limit texture pool to Medium/High to avoid system RAM page file paging spikes.`;
      }

      if (fpsHigh >= 60) {
        displaySyncFit = `Frame rate stays well within the 48-144Hz FreeSync/G-Sync VRR range for tear-free response.`;
      } else {
        displaySyncFit = `Occasional drops below 48Hz will trigger Low Framerate Compensation (LFC).`;
      }

      return {
        laptop,
        report,
        priceInr,
        fpsPerLakh,
        gameplayVerdict,
        thermalBehavior,
        vramHeadroom,
        displaySyncFit,
      };
    });
  }, [comparedLaptops, selectedGame]);

  const maxFps = comparisonResults.length > 0 ? Math.max(...comparisonResults.map(r => r.report.estimatedFps.high1080p)) : 0;
  const maxFpsPerLakh = comparisonResults.length > 0 ? Math.max(...comparisonResults.map(r => r.fpsPerLakh)) : 0;

  const mobileCpus = useMemo(() => CPUS.filter(c => c.platform === 'laptop'), []);
  const mobileGpus = useMemo(() => GPUS.filter(g => g.platform === 'laptop' || (g.platform as string) === 'integrated'), []);

  return (
    <div className="w-full">
      <div className="w-full px-margin md:px-margin-tablet lg:px-margin-desktop max-w-7xl mx-auto py-space-lg flex flex-col gap-space-lg">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-container-high/40 pb-space-sm">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
            <span className="text-primary-container">Matrix Bench</span>
            <span>/</span>
            <span className="text-on-surface">Laptop Pre-Purchase Comparator</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-mono">
              TELEMETRY SYNCED
            </span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="px-2.5 py-0.5 rounded bg-surface-container-high text-primary font-label-sm uppercase font-mono">
              Prices in INR (₹)
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              {comparedLaptops.length} Model{comparedLaptops.length !== 1 ? 's' : ''} Calibrated
            </span>
          </div>
        </div>

        {/* Target Game Selector Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
          <div className="lg:col-span-7 bg-surface-container-low p-space-lg rounded-xl border border-surface-container-high/60 shadow-lg">
            <h1 className="text-headline-lg font-headline-lg text-on-surface uppercase tracking-tight">
              Compare Laptops Before You Buy
            </h1>
            <p className="text-body-md font-body-md text-on-surface-variant mt-space-sm leading-relaxed">
              Don't guess performance based on numbers alone. Evaluate real thermal power limits (TGP), VRAM stability, and detailed gameplay smoothness for <strong className="text-primary-container">{selectedGame?.title || 'Selected Game'}</strong> across laptops available in India.
            </p>
          </div>

          <div className="lg:col-span-5 bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant text-label-sm font-label-sm uppercase">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px]">sports_esports</span>
                <span>Benchmark Target Game</span>
              </div>
              <span className="text-primary">{gamesList.length} Titles Available</span>
            </div>

            {selectedGame ? (
              <div
                onClick={() => setIsGameSelectorOpen(!isGameSelectorOpen)}
                className="flex items-center gap-space-md mt-space-sm cursor-pointer p-space-xs rounded-lg bg-surface-container-lowest border border-surface-container-high/40 hover:bg-surface-container transition-colors"
              >
                <img src={selectedGame.coverImage} alt={selectedGame.title} className="w-12 h-14 object-cover rounded" />
                <div className="min-w-0">
                  <div className="text-body-md font-body-md text-on-surface font-bold truncate">{selectedGame.title}</div>
                  <div className="text-label-sm font-label-sm text-on-surface-variant">{selectedGame.genres?.[0] || 'Game'} • {selectedGame.releaseYear}</div>
                </div>
              </div>
            ) : (
              <div className="p-space-sm text-center text-on-surface-variant animate-pulse">Loading target game...</div>
            )}

            <div ref={searchContainerRef} className="relative mt-space-xs z-10">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="Search any game..."
                  value={gameSearchQuery}
                  onChange={(e) => {
                    setGameSearchQuery(e.target.value);
                    setIsGameSelectorOpen(true);
                  }}
                  onFocus={() => setIsGameSelectorOpen(true)}
                  className="w-full pl-9 pr-4 py-2 rounded bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-sm font-body-sm border border-surface-container-high/60 focus:outline-none focus:border-primary-container transition-all"
                />
              </div>

              {isGameSelectorOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                  {searchedGames.length === 0 ? (
                    <div className="p-space-md text-center text-body-sm text-on-surface-variant">No games found.</div>
                  ) : (
                    searchedGames.map((game: Game) => (
                      <div
                        key={game.id}
                        onClick={() => {
                          setSelectedGame(game);
                          setIsGameSelectorOpen(false);
                          setGameSearchQuery('');
                        }}
                        className={`p-space-sm flex items-center gap-space-sm cursor-pointer transition-colors ${
                          selectedGame?.id === game.id ? 'bg-primary-container/20 text-on-surface font-bold' : 'hover:bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        <img src={game.coverImage} className="w-8 h-10 object-cover rounded" />
                        <div>
                          <div className="text-body-sm font-body-sm">{game.title}</div>
                          <div className="text-label-sm font-label-sm opacity-70">{game.genres?.[0] || 'Game'} • {game.releaseYear}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md p-space-sm rounded-lg bg-surface-container-low border border-surface-container-high/50 shadow-sm">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-label-md font-label-md font-bold flex items-center gap-space-xs hover:bg-primary transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Laptop to Compare ({comparedLaptops.length}/4)</span>
            </button>
            <span className="text-label-sm font-label-sm text-on-surface-variant hidden sm:inline-block">
              Side-by-side thermal &amp; telemetry benchmark
            </span>
          </div>
          {comparedLaptops.length > 0 && (
            <button
              type="button"
              onClick={() => setComparedLaptops([])}
              className="px-3 py-1.5 rounded bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-sm font-label-sm uppercase transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Empty State or Comparison Columns */}
        {comparedLaptops.length === 0 ? (
          <div className="p-space-xl text-center bg-surface-container-low rounded-xl border border-dashed border-outline">
            <span className="material-symbols-outlined text-[48px] text-outline mb-space-sm">laptop_mac</span>
            <h3 className="text-headline-md font-headline-md text-on-surface uppercase">No Laptops in Comparison Deck</h3>
            <p className="text-body-sm font-body-sm text-on-surface-variant max-w-lg mx-auto mt-space-xs">
              Click &quot;Add Laptop to Compare&quot; above to select machines from Lenovo, ASUS, Acer, HP, Dell, or add your custom laptop.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
            {comparisonResults.map(({ laptop, report, priceInr, fpsPerLakh, gameplayVerdict, thermalBehavior, vramHeadroom, displaySyncFit }) => {
              const isUserOwnLaptop = laptop.id === 'user_active_laptop';
              const isTopFps = report.estimatedFps.high1080p === maxFps && maxFps > 0;
              const isBestValue = fpsPerLakh === maxFpsPerLakh && report.canRunMin && priceInr > 0;

              return (
                <div
                  key={laptop.id}
                  className={`rounded-xl bg-surface-container-low p-space-md border shadow-xl relative overflow-hidden flex flex-col gap-space-sm ${
                    isUserOwnLaptop
                      ? 'border-t-4 border-t-green-500 border-surface-container-high/60'
                      : isBestValue
                      ? 'border-t-4 border-t-cyan-500 border-surface-container-high/60'
                      : isTopFps
                      ? 'border-t-4 border-t-blue-500 border-surface-container-high/60'
                      : 'border-surface-container-high/60'
                  }`}
                >
                  {/* Badge Header */}
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
                    <div className="flex flex-wrap gap-1">
                      {isUserOwnLaptop && (
                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-label-sm font-label-sm font-bold uppercase">
                          👑 Active Rig
                        </span>
                      )}
                      {isBestValue && (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-label-sm font-label-sm font-bold uppercase">
                          🏆 Best Value Pick
                        </span>
                      )}
                      {isTopFps && !isBestValue && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-label-sm font-label-sm font-bold uppercase">
                          ⚡ Top Performance
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLaptop(laptop.id)}
                      className="text-outline hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  {/* Model Header */}
                  <div className="flex justify-between items-start pt-1">
                    <div className="min-w-0 pr-2">
                      <div className="text-label-sm font-label-sm text-primary uppercase font-mono">{laptop.brand} • {laptop.series}</div>
                      <div className="text-headline-md font-headline-md text-on-surface font-bold leading-tight mt-0.5 truncate">
                        {laptop.fullName}
                      </div>
                    </div>
                    <div className="text-headline-md font-headline-md text-primary font-bold shrink-0">
                      {priceInr > 0 ? formatINR(priceInr, true) : 'Owned'}
                    </div>
                  </div>

                  {/* Qualitative Experience Breakdown Box */}
                  <div className="p-space-sm rounded-lg bg-surface-container border border-surface-container-high/40 flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase text-outline">Real-World Gameplay Assessment</span>
                      <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm uppercase font-semibold">
                        {report.estimatedFps.high1080p >= 60 ? 'Smooth 60+' : 'Scaled Target'}
                      </span>
                    </div>

                    <p className="font-body-sm text-body-sm text-on-surface font-medium leading-relaxed">
                      {gameplayVerdict}
                    </p>

                    <div className="pt-2 border-t border-surface-container-high/40 flex flex-col gap-1.5 text-body-sm font-body-sm text-on-surface-variant">
                      <div className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">thermostat</span>
                        <span className="leading-tight">{thermalBehavior}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">memory</span>
                        <span className="leading-tight">{vramHeadroom}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">sync</span>
                        <span className="leading-tight">{displaySyncFit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Numbers Matrix */}
                  <div className="p-2.5 rounded bg-surface-container flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm uppercase text-outline">1080p Settings FPS Matrix</span>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className="p-1.5 rounded bg-surface-container-high flex flex-col">
                        <span className="font-label-sm text-outline">LOW</span>
                        <span className="font-headline-md text-primary font-bold">{report.estimatedFps.low1080p}</span>
                      </div>
                      <div className="p-1.5 rounded bg-surface-container-high flex flex-col">
                        <span className="font-label-sm text-outline">MED</span>
                        <span className="font-headline-md text-primary font-bold">{report.estimatedFps.med1080p}</span>
                      </div>
                      <div className="p-1.5 rounded bg-surface-container-high flex flex-col border border-primary-container/30">
                        <span className="font-label-sm text-primary-container font-semibold">HIGH</span>
                        <span className="font-headline-md text-primary-container font-bold">{report.estimatedFps.high1080p}</span>
                      </div>
                      <div className="p-1.5 rounded bg-surface-container-high flex flex-col">
                        <span className="font-label-sm text-outline">ULTRA</span>
                        <span className="font-headline-md text-on-surface font-bold">{report.estimatedFps.ultra1080p}</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Hardware Roster Strip */}
                  <div className="flex flex-col gap-1.5 text-body-sm font-body-sm mt-1">
                    <div className="p-2 rounded bg-surface-container flex items-center justify-between">
                      <span className="text-outline">GPU</span>
                      <span className="text-on-surface font-semibold truncate max-w-[170px]">{laptop.gpuName}</span>
                    </div>
                    <div className="p-2 rounded bg-surface-container flex items-center justify-between">
                      <span className="text-outline">CPU</span>
                      <span className="text-on-surface font-semibold truncate max-w-[170px]">{laptop.cpuName}</span>
                    </div>
                    <div className="p-2 rounded bg-surface-container flex items-center justify-between">
                      <span className="text-outline">RAM / Display</span>
                      <span className="text-on-surface font-semibold">{laptop.ramGb}GB • {laptop.display}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add Laptop (Catalog / Manual) with Dark Theme */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-surface-container-low rounded-xl shadow-2xl p-space-md border border-surface-container-high">
              <div className="flex items-center justify-between mb-space-sm border-b border-surface-container-high pb-space-sm">
                <h3 className="text-headline-md font-headline-md text-on-surface uppercase">Add Laptop to Compare</h3>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-outline hover:text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-space-sm mb-space-md">
                <button
                  type="button"
                  onClick={() => setAddMode('catalog')}
                  className={`py-2 rounded font-label-md text-label-md font-bold transition-colors cursor-pointer ${
                    addMode === 'catalog'
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-surface-container-high/60'
                  }`}
                >
                  From Indian Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('manual')}
                  className={`py-2 rounded font-label-md text-label-md font-bold transition-colors cursor-pointer ${
                    addMode === 'manual'
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-surface-container-high/60'
                  }`}
                >
                  Custom Configuration
                </button>
              </div>

              {addMode === 'catalog' ? (
                <div className="space-y-space-sm">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface-variant mb-1 uppercase">Brand</label>
                    <div className="grid grid-cols-3 gap-2">
                      {LAPTOP_BRANDS.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setCatalogBrand(b);
                            const list = getLaptopsByBrand(b);
                            if (list.length > 0) setCatalogLaptopId(list[0].id);
                          }}
                          className={`py-1.5 rounded font-label-sm text-label-sm font-bold border cursor-pointer ${
                            catalogBrand === b
                              ? 'bg-primary-container text-on-primary-container border-primary-container'
                              : 'bg-surface-container-lowest text-on-surface border-surface-container-high/60 hover:bg-surface-container'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-label-md font-label-md text-on-surface-variant mb-1 uppercase">Select Model</label>
                    <select
                      value={catalogLaptopId}
                      onChange={(e) => setCatalogLaptopId(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none focus:border-primary-container cursor-pointer"
                    >
                      {getLaptopsByBrand(catalogBrand).map(laptop => (
                        <option key={laptop.id} value={laptop.id} className="bg-surface-container-lowest text-on-surface">
                          {laptop.modelName} — {formatINR(laptop.priceUsd * 83, true)} ({laptop.gpuName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-space-sm mt-space-md pt-2 border-t border-surface-container-high/40">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 rounded text-on-surface-variant hover:text-on-surface font-label-md text-label-md uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFromCatalog}
                      className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold uppercase cursor-pointer"
                    >
                      Add to Comparison
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-space-sm max-h-[420px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-space-sm">
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">Brand</label>
                      <input
                        type="text"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">Model Name</label>
                      <input
                        type="text"
                        value={customModelName}
                        onChange={(e) => setCustomModelName(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">Price (₹ INR)</label>
                      <input
                        type="number"
                        value={customPriceInr}
                        onChange={(e) => setCustomPriceInr(Number(e.target.value))}
                        className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">TGP (Watts)</label>
                      <input
                        type="number"
                        value={customTgp}
                        onChange={(e) => setCustomTgp(Number(e.target.value))}
                        className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">CPU</label>
                    <select
                      value={customCpuName}
                      onChange={(e) => setCustomCpuName(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none cursor-pointer"
                    >
                      {mobileCpus.map(c => (
                        <option key={c.id} value={c.name} className="bg-surface-container-lowest text-on-surface">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">GPU</label>
                    <select
                      value={customGpuName}
                      onChange={(e) => {
                        setCustomGpuName(e.target.value);
                        const g = GPUS.find(item => item.name === e.target.value);
                        if (g && g.vramGb) setCustomVramGb(g.vramGb);
                      }}
                      className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none cursor-pointer"
                    >
                      {mobileGpus.map(g => (
                        <option key={g.id} value={g.name} className="bg-surface-container-lowest text-on-surface">
                          {g.name} ({g.vramGb || 4}GB VRAM)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-space-sm">
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">RAM (GB)</label>
                      <select
                        value={customRamGb}
                        onChange={(e) => setCustomRamGb(Number(e.target.value))}
                        className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none cursor-pointer"
                      >
                        <option value={8} className="bg-surface-container-lowest text-on-surface">8 GB</option>
                        <option value={16} className="bg-surface-container-lowest text-on-surface">16 GB</option>
                        <option value={32} className="bg-surface-container-lowest text-on-surface">32 GB</option>
                        <option value={64} className="bg-surface-container-lowest text-on-surface">64 GB</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase">Display</label>
                      <input
                        type="text"
                        value={customDisplay}
                        onChange={(e) => setCustomDisplay(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-surface-container-high/60 rounded p-2 text-on-surface font-body-sm text-body-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-space-sm mt-space-md pt-2 border-t border-surface-container-high/40">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 rounded text-on-surface-variant hover:text-on-surface font-label-md text-label-md uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualLaptop}
                      className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold uppercase cursor-pointer"
                    >
                      Add Custom Laptop
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
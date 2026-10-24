import React, { useState, useMemo, useEffect } from 'react';
import type { Game } from '../types';
import { CPUS, GPUS, CPU_COOLERS, PC_CASES, GAMING_MONITORS } from '../data/hardware';
import { evaluateCompatibility } from '../utils/engine';
import { formatINR } from '../utils/currency';
import { externalGameService } from '../services/gameapi';

interface EvaluatedGameItem {
  game: Game;
  report: ReturnType<typeof evaluateCompatibility>;
  fps: number;
}

export const PCBuilder: React.FC = () => {
  const desktopCpus = useMemo(() => CPUS.filter((c) => c.platform === 'desktop'), []);
  const desktopGpus = useMemo(() => GPUS.filter((g) => g.platform === 'desktop'), []);

  // Component Selection States
  const [selectedCpuId, setSelectedCpuId] = useState<string>('cpu-r5-5600');
  const [selectedGpuId, setSelectedGpuId] = useState<string>('gpu-rx-6600');
  const [selectedRamGb, setSelectedRamGb] = useState<number>(16);
  const [selectedStorageSize, setSelectedStorageSize] = useState<'500gb' | '1tb' | '2tb' | '4tb'>('1tb');
  const [selectedCoolerId, setSelectedCoolerId] = useState<string>(CPU_COOLERS[0]?.id || 'cooler-arctic-lf3-360');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(PC_CASES[0]?.id || 'case-lianli-o11-dynamic-evo');
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>(GAMING_MONITORS[0]?.id || 'mon-lg-32gs95ue');

  const cpu = desktopCpus.find((c) => c.id === selectedCpuId) || desktopCpus[0];
  const gpu = desktopGpus.find((g) => g.id === selectedGpuId) || desktopGpus[0];
  const cooler = CPU_COOLERS.find((c) => c.id === selectedCoolerId) || CPU_COOLERS[0];
  const pcCase = PC_CASES.find((c) => c.id === selectedCaseId) || PC_CASES[0];
  const monitor = GAMING_MONITORS.find((m) => m.id === selectedMonitorId) || GAMING_MONITORS[0];

  const storageConfig = {
    '500gb': { name: '500GB NVMe PCIe 4.0 SSD (3500 MB/s)', priceUsd: 42 },
    '1tb': { name: '1TB NVMe PCIe 4.0 SSD (5000 MB/s)', priceUsd: 69 },
    '2tb': { name: '2TB NVMe PCIe 4.0 SSD (7000 MB/s High Speed)', priceUsd: 129 },
    '4tb': { name: '4TB NVMe PCIe 4.0 SSD (Maximum Game Library)', priceUsd: 249 },
  }[selectedStorageSize];

  const ramPriceUsd = selectedRamGb === 64 ? 139 : selectedRamGb === 32 ? 75 : selectedRamGb === 16 ? 42 : 25;
  const motherboardPsuCostUsd = 210;

  const systemOnlyPriceUsd =
    (cpu.typicalPriceUsd || 150) +
    (gpu.typicalPriceUsd || 250) +
    ramPriceUsd +
    storageConfig.priceUsd +
    cooler.priceUsd +
    pcCase.priceUsd +
    motherboardPsuCostUsd;

  const totalFullSetupPriceUsd = systemOnlyPriceUsd + monitor.priceUsd;

  // CPU/GPU Pairing & Bottleneck Advisory
  const cpuGpuRatio = cpu.score / Math.max(100, gpu.score);
  let bottleneckPercent = 4;
  let bottleneckLabel = 'Balanced Core Hardware';
  let bottleneckAdvice = 'Your CPU and GPU are ideally balanced. Neither component severely holds back the other.';
  let isImbalanced = false;
  let suggestedGpu: typeof desktopGpus[0] | null = null;
  let suggestedCpu: typeof desktopCpus[0] | null = null;

  if (cpuGpuRatio < 0.85 && gpu.score > 10000) {
    isImbalanced = true;
    bottleneckPercent = Math.min(48, Math.round((1 - cpuGpuRatio) * 45));
    bottleneckLabel = `CPU Bottleneck (~${bottleneckPercent}%)`;

    suggestedCpu =
      desktopCpus
        .filter((c) => c.score >= gpu.score * 0.95)
        .sort((a, b) => a.score - b.score)[0] || desktopCpus[desktopCpus.length - 1];

    bottleneckAdvice = `Your ${gpu.name} is powerful, but ${cpu.name} will restrict maximum frame stability.`;
  } else if (cpuGpuRatio > 2.1 && gpu.score < 12000) {
    isImbalanced = true;
    bottleneckPercent = Math.min(50, Math.round((cpuGpuRatio - 1.8) * 20));
    bottleneckLabel = `GPU Bottleneck (~${bottleneckPercent}%)`;

    suggestedGpu =
      desktopGpus
        .filter((g) => cpu.score / Math.max(100, g.score) <= 1.5)
        .sort((a, b) => a.score - b.score)[0] || desktopGpus[desktopGpus.length - 1];

    bottleneckAdvice = `Your ${cpu.name} has massive compute headroom, but ${gpu.name} will run pegged at 99-100%.`;
  }

  const estimatedCpuTdpWatts = cpu.name.includes('i9')
    ? 253
    : cpu.name.includes('i7') || cpu.name.includes('7950X') || cpu.name.includes('7800X3D')
    ? 140
    : 65;
  const isCoolerThrottling = cooler.maxTdpWatts < estimatedCpuTdpWatts;

  // Live Games & Dynamic Deck State
  const [catalogGames, setCatalogGames] = useState<Game[]>([]);
  const [evaluatedGames, setEvaluatedGames] = useState<Game[]>([]);
  const [gameSearchInput, setGameSearchInput] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Load online catalog on mount
  useEffect(() => {
    let isMounted = true;
    externalGameService.fetchFreeToPlayGames().then((data) => {
      if (isMounted && data.length > 0) {
        setCatalogGames(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced search via CheapShark fallback
  useEffect(() => {
    const q = gameSearchInput.trim().toLowerCase();
    if (q.length < 3) return;

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const remote = await externalGameService.searchCheapShark(q);
      if (isCurrent && remote.length > 0) {
        setCatalogGames((prev) => {
          const seen = new Set(prev.map((g) => g.id));
          const uniqueRemote = remote.filter((g) => !seen.has(g.id));
          return [...uniqueRemote, ...prev];
        });
      }
      setIsSearching(false);
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [gameSearchInput]);

  const evaluateGame = (game: Game) => {
    const report = evaluateCompatibility(game, {
      isLaptop: false,
      cpuName: cpu.name,
      cpuScore: cpu.score,
      gpuName: gpu.name,
      gpuScore: gpu.score,
      ramGb: selectedRamGb,
      vramGb: gpu.vramGb || 4,
      storageGb: 1000,
      isSsd: true,
      coolerId: cooler.id,
      coolerName: cooler.name,
      caseId: pcCase.id,
      caseName: pcCase.name,
      monitorId: monitor.id,
      monitorName: monitor.name,
      monitorRefreshRate: monitor.refreshRateHz,
    });

    let displayFps = report.estimatedFps.high1080p;
    if (monitor.resolution === '1440p') {
      displayFps = report.estimatedFps.med1440p;
    } else if (monitor.resolution === '4K') {
      displayFps = Math.max(15, Math.round(report.estimatedFps.med1440p * 0.62));
    }

    return { game, report, fps: displayFps };
  };

  // Evaluated games sorted descending by FPS
  const sortedEvaluatedGames: EvaluatedGameItem[] = useMemo(() => {
    return evaluatedGames
      .map((g) => evaluateGame(g))
      .sort((a, b) => b.fps - a.fps);
  }, [evaluatedGames, cpu, gpu, selectedRamGb, cooler, pcCase, monitor]);

  // Search results for adding games
  const filteredSearchGames = useMemo(() => {
    if (!gameSearchInput.trim()) return [];
    const q = gameSearchInput.toLowerCase().trim();
    return catalogGames.filter(
      (g: Game) =>
        (g.title.toLowerCase().includes(q) ||
          ((q === 'pubg' || q.includes('pubg')) && g.title.toLowerCase().includes('battlegrounds')) ||
          ((q === 'battlegrounds' || q.includes('battleground')) && g.title.toLowerCase().includes('pubg'))) &&
        !evaluatedGames.some((eg) => eg.id === g.id)
    );
  }, [gameSearchInput, catalogGames, evaluatedGames]);

  const handleAddGame = (gameToAdd: Game) => {
    if (!evaluatedGames.some((g) => g.id === gameToAdd.id)) {
      setEvaluatedGames((prev) => [gameToAdd, ...prev]);
    }
    setGameSearchInput('');
    setIsDropdownOpen(false);
  };

  const handleRemoveGame = (gameId: string) => {
    setEvaluatedGames((prev) => prev.filter((g) => g.id !== gameId));
  };

  return (
    <div className="w-full text-on-surface">
      <div className="w-full px-margin md:px-margin-tablet lg:px-margin-desktop max-w-7xl mx-auto">
        {/* Header Breadcrumbs */}
        <div className="pt-space-lg pb-space-sm flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-on-surface font-semibold">Custom PC Builder &amp; Benchmark Deck</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="px-2 py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm border border-surface-container-high">
              Synergy Index: {100 - bottleneckPercent}%
            </span>
            <span className="px-2 py-1 rounded bg-surface-container text-primary font-label-sm text-label-sm font-mono border border-surface-container-high">
              Pricing in INR (₹)
            </span>
          </div>
        </div>

        <header className="py-space-md">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-surface-container-lowest via-surface-container-low to-surface-container-lowest p-space-lg md:p-space-xl shadow-xl border border-surface-container-high/60">
            <h1 className="text-[32px] md:text-[40px] font-black text-on-surface tracking-tight uppercase">
              Full PC Build Simulator
            </h1>
            <p className="text-body-md font-body-md text-on-surface-variant mt-space-sm max-w-3xl leading-relaxed">
              Configure your components below. Search and add any game to your benchmark deck with the <strong>+</strong> button to test live compatibility and view intelligent upgrade advice.
            </p>
          </div>
        </header>

        {/* Status Section */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-space-sm pb-space-md">
          <div className="p-space-sm rounded-lg bg-surface-container border-l-4 border-l-orange-500 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface text-label-md uppercase">{bottleneckLabel}</span>
                {isImbalanced && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-label-sm uppercase font-bold text-[11px]">
                    Optimization Suggested
                  </span>
                )}
              </div>
              <div className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">{bottleneckAdvice}</div>
            </div>

            {suggestedCpu && (
              <div className="mt-2 pt-2 border-t border-surface-container-high flex items-center justify-between gap-2">
                <span className="text-body-sm text-primary-container">
                  Suggested CPU for {gpu.name}: <strong>{suggestedCpu.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCpuId(suggestedCpu!.id)}
                  className="px-2.5 py-1 rounded bg-primary-container text-on-primary-container text-label-sm font-bold uppercase transition-all hover:bg-primary cursor-pointer shrink-0"
                >
                  Apply CPU
                </button>
              </div>
            )}

            {suggestedGpu && (
              <div className="mt-2 pt-2 border-t border-surface-container-high flex items-center justify-between gap-2">
                <span className="text-body-sm text-primary-container">
                  Suggested GPU for {cpu.name}: <strong>{suggestedGpu.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGpuId(suggestedGpu!.id)}
                  className="px-2.5 py-1 rounded bg-primary-container text-on-primary-container text-label-sm font-bold uppercase transition-all hover:bg-primary cursor-pointer shrink-0"
                >
                  Apply GPU
                </button>
              </div>
            )}
          </div>

          <div
            className={`p-space-sm rounded-lg bg-surface-container border-l-4 ${
              isCoolerThrottling ? 'border-l-red-500' : 'border-l-green-500'
            } shadow-sm`}
          >
            <div className="font-bold text-on-surface text-label-md uppercase">Cooler Thermal Status</div>
            <div className="text-body-sm text-on-surface-variant mt-1">
              {isCoolerThrottling
                ? 'Thermal Throttling Alert: Undersized cooler for selected processor.'
                : 'Sufficient Cooling Headroom for sustained boost clocks.'}
            </div>
            <div className="text-label-sm text-outline mt-2 font-mono">
              Estimated CPU TDP: ~{estimatedCpuTdpWatts}W | Cooler Capacity: {cooler.maxTdpWatts}W
            </div>
          </div>
        </div>

        <main className="py-space-sm grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Component Selection */}
          <div className="lg:col-span-5 space-y-space-md">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-space-xs uppercase">
                <span className="material-symbols-outlined text-[20px] text-primary-container">tune</span>
                Component Roster
              </h2>
              <span className="px-2.5 py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold uppercase">
                7/7 Configured
              </span>
            </div>

            {/* CPU */}
            <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">memory</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">CPU Processor</div>
                  <div className="text-body-md font-body-md text-on-surface font-bold truncate">{cpu.name}</div>
                </div>
                <div className="text-headline-md font-headline-md text-primary font-bold">
                  {formatINR(cpu.typicalPriceUsd || 150)}
                </div>
              </div>
              <div className="mt-space-sm">
                <select
                  value={selectedCpuId}
                  onChange={(e) => setSelectedCpuId(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-surface-container-lowest text-on-surface text-body-sm font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none cursor-pointer"
                >
                  {desktopCpus.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface-container-lowest text-on-surface">
                      {c.name} — {formatINR(c.typicalPriceUsd || 150)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GPU */}
            <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">developer_board</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">Graphics Card</div>
                  <div className="text-body-md font-body-md text-on-surface font-bold truncate">{gpu.name}</div>
                </div>
                <div className="text-headline-md font-headline-md text-primary font-bold">
                  {formatINR(gpu.typicalPriceUsd || 250)}
                </div>
              </div>
              <div className="mt-space-sm">
                <select
                  value={selectedGpuId}
                  onChange={(e) => setSelectedGpuId(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-surface-container-lowest text-on-surface text-body-sm font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none cursor-pointer"
                >
                  {desktopGpus.map((g) => (
                    <option key={g.id} value={g.id} className="bg-surface-container-lowest text-on-surface">
                      {g.name} — {formatINR(g.typicalPriceUsd || 250)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* RAM */}
            <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">straighten</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">System Memory</div>
                  <div className="text-body-md font-body-md text-on-surface font-bold">{selectedRamGb}GB DDR5</div>
                </div>
                <div className="text-headline-md font-headline-md text-primary font-bold">{formatINR(ramPriceUsd)}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-space-sm">
                {[8, 16, 32, 64].map((ram) => (
                  <button
                    key={ram}
                    type="button"
                    onClick={() => setSelectedRamGb(ram)}
                    className={`py-1.5 rounded text-label-sm font-label-sm font-bold uppercase transition-all cursor-pointer ${
                      selectedRamGb === ram
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-surface-container-high/50'
                    }`}
                  >
                    {ram}GB
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">save</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">NVMe Storage</div>
                  <div className="text-body-md font-body-md text-on-surface font-bold truncate">
                    {storageConfig.name}
                  </div>
                </div>
                <div className="text-headline-md font-headline-md text-primary font-bold">
                  {formatINR(storageConfig.priceUsd)}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-space-sm">
                {(['500gb', '1tb', '2tb', '4tb'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedStorageSize(size)}
                    className={`py-1.5 rounded text-label-sm font-label-sm font-bold uppercase transition-all cursor-pointer ${
                      selectedStorageSize === size
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-surface-container-high/50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Cooler */}
            <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">mode_fan</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">CPU Cooler</div>
                  <div className="text-body-md font-body-md text-on-surface font-bold truncate">{cooler.name}</div>
                </div>
                <div className="text-headline-md font-headline-md text-primary font-bold">
                  {cooler.priceUsd > 0 ? formatINR(cooler.priceUsd) : 'Included'}
                </div>
              </div>
              <div className="mt-space-sm">
                <select
                  value={selectedCoolerId}
                  onChange={(e) => setSelectedCoolerId(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-surface-container-lowest text-on-surface text-body-sm font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none cursor-pointer"
                >
                  {CPU_COOLERS.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface-container-lowest text-on-surface">
                      {c.name} — {c.priceUsd > 0 ? formatINR(c.priceUsd) : 'Free'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Case */}
            <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">PC Case</div>
                  <div className="text-body-md font-body-md text-on-surface font-bold truncate">{pcCase.name}</div>
                </div>
                <div className="text-headline-md font-headline-md text-primary font-bold">
                  {formatINR(pcCase.priceUsd)}
                </div>
              </div>
              <div className="mt-space-sm">
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-surface-container-lowest text-on-surface text-body-sm font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none cursor-pointer"
                >
                  {PC_CASES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface-container-lowest text-on-surface">
                      {c.name} — {formatINR(c.priceUsd)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Monitor */}
            <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[20px]">desktop_windows</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">Gaming Monitor</div>
                  <div className="text-body-md font-body-md text-on-surface font-bold truncate">{monitor.name}</div>
                </div>
                <div className="text-headline-md font-headline-md text-primary font-bold">
                  {formatINR(monitor.priceUsd)}
                </div>
              </div>
              <div className="mt-space-sm">
                <select
                  value={selectedMonitorId}
                  onChange={(e) => setSelectedMonitorId(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-surface-container-lowest text-on-surface text-body-sm font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none cursor-pointer"
                >
                  {GAMING_MONITORS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-surface-container-lowest text-on-surface">
                      {m.name} — {formatINR(m.priceUsd)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="rounded-xl border border-primary-container bg-surface-container p-space-md shadow-lg">
              <h3 className="text-headline-md font-headline-md text-on-surface mb-space-sm uppercase">Total Build Cost (BOM)</h3>
              <div className="space-y-1.5 text-body-sm font-body-sm text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Core PC Tower (inc. Motherboard &amp; PSU)</span>
                  <span className="text-on-surface font-semibold">{formatINR(systemOnlyPriceUsd)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Display Monitor ({monitor.refreshRateHz}Hz {monitor.resolution})</span>
                  <span className="text-on-surface font-semibold">{formatINR(monitor.priceUsd)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-space-sm pt-space-sm border-t border-outline/50">
                <span className="text-label-md font-label-md font-bold text-on-surface uppercase">Full Setup Total</span>
                <span className="text-headline-lg font-headline-lg text-primary font-bold">
                  {formatINR(totalFullSetupPriceUsd)}
                </span>
              </div>
            </div>
          </div>

          {/* Target Evaluator & Live Game Deck */}
          <div className="lg:col-span-7 space-y-space-md">
            {/* Search & Add Bar */}
            <div className="w-full rounded-xl bg-surface-container-low p-space-md border border-surface-container-high/60 shadow-md flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[24px]">sports_esports</span>
                <h3 className="font-headline-md text-headline-md text-on-surface uppercase">
                  Add Games to Benchmark Deck
                </h3>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Search any game and click <strong className="text-primary-container">+</strong> to evaluate frame rates and hardware bottlenecks. The list automatically ranks in descending order (highest FPS first).
              </p>

              {/* Search + Plus Button Input */}
              <div className="relative mt-1">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className={`material-symbols-outlined absolute left-3 top-2.5 text-outline text-[20px] ${isSearching ? 'animate-spin' : ''}`}>
                      {isSearching ? 'sync' : 'search'}
                    </span>
                    <input
                      type="text"
                      placeholder="Type a game title (e.g. Cyberpunk, PUBG, Battlegrounds)..."
                      value={gameSearchInput}
                      onChange={(e) => {
                        setGameSearchInput(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface text-body-sm font-body-sm border border-surface-container-high/60 focus:outline-none focus:border-primary-container"
                    />
                  </div>
                  {filteredSearchGames[0] && (
                    <button
                      type="button"
                      onClick={() => handleAddGame(filteredSearchGames[0])}
                      className="h-10 px-4 rounded-lg bg-primary-container text-on-primary-container font-label-md uppercase font-bold flex items-center gap-1 shadow-sm hover:bg-primary transition-all cursor-pointer shrink-0"
                      title={`Add ${filteredSearchGames[0].title}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                      <span>Add</span>
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && filteredSearchGames.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface-container-lowest border border-surface-container-high/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {filteredSearchGames.map((game) => (
                      <div
                        key={game.id}
                        onClick={() => handleAddGame(game)}
                        className="p-2.5 flex items-center justify-between hover:bg-surface-container text-on-surface cursor-pointer transition-colors border-b border-surface-container-high/30 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <img src={game.coverImage} alt={game.title} className="w-8 h-10 rounded object-cover" />
                          <div>
                            <div className="text-body-sm font-bold text-on-surface">{game.title}</div>
                            <div className="text-label-sm text-outline">
                              {game.genres?.join(', ') || 'Game'} • {game.releaseYear}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Evaluated Games List in Descending Order */}
            <div className="space-y-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-sm uppercase text-outline">
                  Live Benchmarks ({sortedEvaluatedGames.length} active • Sorted by Highest FPS)
                </span>
                {sortedEvaluatedGames.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEvaluatedGames([])}
                    className="text-label-sm text-outline hover:text-on-surface uppercase cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {sortedEvaluatedGames.length === 0 ? (
                <div className="p-space-lg text-center bg-surface-container-low rounded-xl border border-dashed border-outline/50">
                  <span className="material-symbols-outlined text-[40px] text-outline mb-2">playlist_add</span>
                  <div className="text-body-md font-bold text-on-surface">No Games in Benchmark Deck</div>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    Search and click <strong>+</strong> above to add games to your live performance matrix.
                  </p>
                </div>
              ) : (
                sortedEvaluatedGames.map(({ game, report, fps }) => {
                  const isPoorPerformance = fps < 60 || !report.canRunRec;

                  return (
                    <div
                      key={game.id}
                      className="rounded-xl bg-surface-container-low p-space-md border border-surface-container-high/60 shadow-md flex flex-col gap-space-sm transition-all"
                    >
                      <div className="flex items-center gap-space-md">
                        <img src={game.coverImage} alt={game.title} className="w-12 h-16 rounded object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-body-md font-bold text-on-surface truncate">{game.title}</div>
                          <div className="text-label-sm text-on-surface-variant truncate mt-0.5">
                            {game.genres?.join(', ') || 'Game'} • {game.releaseYear}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[30px] font-telemetry-val text-primary leading-none font-bold">{fps}</div>
                          <div className="text-label-sm text-on-surface-variant font-mono uppercase">Estimated FPS</div>
                          <div className="mt-1">
                            {report.canRunRec ? (
                              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                60+ FPS Ready
                              </span>
                            ) : report.canRunMin ? (
                              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider">
                                Scaled / Medium
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                Sub-Optimal
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveGame(game.id)}
                          className="text-outline hover:text-on-surface p-1 cursor-pointer shrink-0"
                          title="Remove from deck"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>

                      {/* Diagnostic Advisory Div */}
                      {isPoorPerformance ? (
                        <div className="p-2.5 rounded-lg bg-error-container/20 border border-error/30 flex items-start gap-2 text-body-sm">
                          <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">warning</span>
                          <div className="flex flex-col">
                            <span className="text-error font-bold text-label-sm uppercase">Upgrade Advisory:</span>
                            <span className="text-on-surface-variant text-[13px] leading-relaxed">
                              {gpu.score < 15000
                                ? `GPU is the primary bottleneck for ${game.title}. Swap ${gpu.name} for an RTX 4060 or RX 7600 to clear 60 FPS on High.`
                                : selectedRamGb < 16
                                ? `System RAM (${selectedRamGb}GB) is insufficient. Upgrade to 16GB RAM to prevent stuttering.`
                                : `CPU single-core throughput is limiting maximum frame rendering. Upgrade to a Ryzen 5 7600 or Core i5-13400F.`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-primary-container/10 border border-primary-container/30 flex items-center gap-2 text-body-sm">
                          <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0">check_circle</span>
                          <span className="text-primary-container text-[13px] font-medium">
                            No upgrade required: Your {gpu.name} + {cpu.name} pairing handles {game.title} smoothly at {monitor.resolution}.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PCBuilder;
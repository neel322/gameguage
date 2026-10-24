import type { Game, UserRigSpecs } from '../types';

export interface CompatibilityReport {
  overallScore: number;
  canRunMin: boolean;
  canRunRec: boolean;
  verdict: string;
  bottleneck: {
    percentage: number;
    component: string;
    explanation: string;
  };
  estimatedFps: {
    low1080p: number;
    med1080p: number;
    high1080p: number;
    ultra1080p: number;
    med1440p: number;
    high1440p: number;
  };
}

// Helpers to extract requirement values safely from any Game schema
const getTargetGpuScore = (game: Game): number => {
  return (
    (game as any)?.recommended?.gpuScore ||
    (game as any)?.recGpuScore ||
    (game as any)?.recommendedGpuScore ||
    ((game as any)?.minimum?.gpuScore ? (game as any).minimum.gpuScore * 1.5 : 8500)
  );
};

const getTargetCpuScore = (game: Game): number => {
  return (
    (game as any)?.recommended?.cpuScore ||
    (game as any)?.recCpuScore ||
    (game as any)?.recommendedCpuScore ||
    ((game as any)?.minimum?.cpuScore ? (game as any).minimum.cpuScore * 1.4 : 10000)
  );
};

const getTargetRamGb = (game: Game): number => {
  const ram =
    (game as any)?.recommended?.ramGb ||
    (game as any)?.recRamGb ||
    (game as any)?.recommendedRam;

  if (ram) return Number(ram);
  if ((game as any)?.minimumRequirements?.ram) {
    const parsed = parseInt((game as any).minimumRequirements.ram, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 12;
};

export const evaluateCompatibility = (
  game: Game | null | undefined,
  rig: UserRigSpecs & { [key: string]: any }
): CompatibilityReport => {
  // Fallback defaults if game is not yet loaded or null
  if (!game) {
    return {
      overallScore: 50,
      canRunMin: true,
      canRunRec: true,
      verdict: 'Pending Game Selection',
      bottleneck: { percentage: 0, component: 'None', explanation: 'No game selected.' },
      estimatedFps: {
        low1080p: 60,
        med1080p: 50,
        high1080p: 45,
        ultra1080p: 35,
        med1440p: 35,
        high1440p: 28,
      },
    };
  }

  // Safe genre and tag arrays to prevent `.includes` on undefined
  const genres: string[] = Array.isArray(game?.genres) ? game.genres : [];
  const tags: string[] = Array.isArray((game as any)?.tags) ? (game as any).tags : [];

  const isEsports =
    genres.some((g) => typeof g === 'string' && (g.includes('Shooter') || g.includes('FPS') || g.includes('Battle Royale'))) ||
    tags.some((t) => typeof t === 'string' && (t.includes('Esports') || t.includes('Competitive')));

  const targetGpu = getTargetGpuScore(game);
  const targetCpu = getTargetCpuScore(game);
  const targetRam = getTargetRamGb(game);

  const gpuRelative = Math.min(2.2, Math.max(0.25, (rig.gpuScore || 5000) / targetGpu));
  const cpuRelative = Math.min(2.0, Math.max(0.3, (rig.cpuScore || 6000) / targetCpu));
  const ramFactor = Math.min(1.15, Math.max(0.6, (rig.ramGb || 8) / targetRam));

  // Esports scaling multiplier
  const genreMultiplier = isEsports ? 1.35 : 1.0;
  const platformScale = rig.isLaptop ? 0.88 : 1.0;

  const baseFps = (56 * gpuRelative * 0.65 + 56 * cpuRelative * 0.25 + 56 * ramFactor * 0.1) * genreMultiplier * platformScale;
  const high1080p = Math.max(15, Math.round(baseFps));
  const med1080p = Math.round(high1080p * 1.15);
  const low1080p = Math.round(high1080p * 1.38);
  const ultra1080p = Math.max(10, Math.round(high1080p * 0.78));

  const med1440p = Math.max(12, Math.round(med1080p * 0.72));
  const high1440p = Math.max(10, Math.round(high1080p * 0.72));

  const canRunMin = high1080p >= 30;
  const canRunRec = high1080p >= 55;

  const overallScore = Math.min(100, Math.max(15, Math.round((high1080p / 60) * 65)));

  // Bottleneck detection
  const ratio = ((rig.cpuScore || 5000) / Math.max(100, rig.gpuScore || 5000)) * 0.85;
  let bottleneck = {
    percentage: 4,
    component: 'Balanced',
    explanation: 'Hardware throughput is in harmony. No severe throttling detected.',
  };

  if (ratio > 1.35) {
    bottleneck = {
      percentage: Math.min(45, Math.round((ratio - 1) * 25)),
      component: 'GPU Bound',
      explanation: 'Your GPU is underpowered relative to CPU processing speed at higher resolutions.',
    };
  } else if (ratio < 0.68) {
    bottleneck = {
      percentage: Math.min(45, Math.round((1 - ratio) * 32)),
      component: 'CPU Bound',
      explanation: 'Your CPU may bottleneck frame pacing during intense geometry calculations.',
    };
  }

  let verdict = 'Playable at 1080p Medium Preset';
  if (high1080p >= 75) verdict = 'Ultra Smooth Esports / AAA Experience';
  else if (high1080p >= 55) verdict = 'Great to Play (Smooth 60 FPS Target)';
  else if (high1080p >= 40) verdict = 'Playable with Scaled / Low Settings';
  else verdict = 'Hardware Upgrade Advised';

  return {
    overallScore,
    canRunMin,
    canRunRec,
    verdict,
    bottleneck,
    estimatedFps: {
      low1080p,
      med1080p,
      high1080p,
      ultra1080p,
      med1440p,
      high1440p,
    },
  };
};

export default evaluateCompatibility;
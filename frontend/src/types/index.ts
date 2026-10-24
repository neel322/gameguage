export interface SystemRequirements {
  cpuName: string;
  cpuScore: number; // Benchmark normalized score (0 - 35000)
  gpuName: string;
  gpuScore: number; // Benchmark normalized score (0 - 30000)
  vramGb: number;
  ramGb: number;
  storageGb: number;
  isSsdRequired?: boolean;
}

export interface SimilarLighterGame {
  id: string;
  title: string;
  coverImage: string;
  genres: string[];
  vibeReason: string;
  minRamGb: number;
  minGpuScore: number;
  minCpuScore: number;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  bannerImage?: string;
  releaseYear: number;
  developer: string;
  genres: string[];
  tags: string[];
  popularityRank: number;
  minimum: SystemRequirements;
  recommended: SystemRequirements;
  similarLighterGames: SimilarLighterGame[];
}

export interface HardwareComponent {
  id: string;
  name: string;
  brand: 'Intel' | 'AMD' | 'NVIDIA' | 'Apple' | 'Other';
  type: 'cpu' | 'gpu';
  platform: 'desktop' | 'laptop' | 'integrated';
  score: number; // Normalized benchmark rating
  vramGb?: number;
  typicalPriceUsd?: number;
  tier: 'low' | 'mid' | 'high' | 'enthusiast';
  tdpWatts?: number;
}

export interface CpuCooler {
  id: string;
  name: string;
  type: 'stock' | 'air_tower' | 'aio_240' | 'aio_360';
  maxTdpWatts: number;
  priceUsd: number;
  fanRpm: string;
  noiseDb: string;
}

export interface PcCase {
  id: string;
  name: string;
  airflowType: 'High Airflow Mesh' | 'Dual Chamber Panoramic' | 'Compact Airflow' | 'Budget Entry';
  includedFans: string;
  priceUsd: number;
  formFactor: string;
}

export interface GamingMonitor {
  id: string;
  name: string;
  resolution: '1080p' | '1440p' | '4K';
  refreshRateHz: number;
  panelType: 'IPS' | 'OLED' | 'Fast VA';
  responseTime: string;
  priceUsd: number;
  screenSize: string;
}


export interface LaptopModel {
  id: string;
  brand: 'Lenovo' | 'ASUS' | 'HP' | 'Acer' | 'Dell' | 'MSI' | 'Apple' | 'Razer';
  modelName: string;
  fullName: string;
  series: string; // e.g. "LOQ", "TUF", "Victus", "Nitro", "MacBook Air"
  priceUsd: number;
  cpuName: string;
  cpuScore: number;
  gpuName: string;
  gpuScore: number;
  vramGb: number;
  ramGb: number;
  storage: string;
  display: string;
  tgpWatts?: number;
  image?: string;
}

export interface UserRigSpecs {
  isLaptop: boolean;
  laptopBrand?: string;
  laptopModelId?: string;
  cpuName: string;
  cpuScore: number;
  gpuName: string;
  gpuScore: number;
  ramGb: number;
  vramGb: number;
  storageGb: number;
  isSsd: boolean;
  targetResolution?: '1080p' | '1440p' | '4K';
  coolerId?: string;
  coolerName?: string;
  caseId?: string;
  caseName?: string;
  monitorId?: string;
  monitorName?: string;
  monitorRefreshRate?: number;
}

export interface UserDevice {
  id: string;
  userId: string;
  name: string;
  deviceType: 'laptop' | 'desktop';
  brand?: string;
  modelName?: string;
  specs: UserRigSpecs;
  isPrimary: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  rigName: string;
  defaultRig: UserRigSpecs;
  devices?: UserDevice[];
  createdAt: string;
}


export interface ComponentCheckStatus {
  passedMin: boolean;
  passedRec: boolean;
  userValue: number | string;
  minValue: number | string;
  recValue: number | string;
  percentageOfRec: number;
}

export interface BottleneckAnalysis {
  bottleneckType: 'CPU' | 'GPU' | 'RAM' | 'Balanced';
  percentage: number;
  summary: string;
  detailedAnalysis: string;
}

export interface UpgradeRecommendation {
  isLaptop: boolean;
  urgency: 'critical' | 'recommended' | 'none';
  headline: string;
  actionPoints: string[];
  partUpgrades?: {
    partType: 'GPU' | 'CPU' | 'RAM' | 'Storage';
    name: string;
    estimatedPrice: string;
    fpsGainEstimate: string;
  }[];
  suggestedLaptopAlternative?: {
    modelName: string;
    brand: string;
    price: number;
    expectedTier: string;
    whyBetter: string;
  };
}

export type PlayabilityTier = 
  | 'unplayable' 
  | 'playable_low' 
  | 'smooth_med' 
  | 'optimal_high' 
  | 'ultra_flagship';

export interface CompatibilityReport {
  game: Game;
  userSpecs: UserRigSpecs;
  playabilityTier: PlayabilityTier;
  overallGaugeScore: number; // 0 to 100
  canRunMin: boolean;
  canRunRec: boolean;
  statusLabel: string;
  statusDescription: string;
  estimatedFps: {
    low1080p: number;
    med1080p: number;
    high1080p: number;
    ultra1080p: number;
    med1440p: number;
  };
  componentChecks: {
    cpu: ComponentCheckStatus;
    gpu: ComponentCheckStatus;
    ram: ComponentCheckStatus;
    vram: ComponentCheckStatus;
  };
  bottleneck: BottleneckAnalysis;
  upgradeRecommendation: UpgradeRecommendation;
  playableSimilarGames: {
    id: string;
    title: string;
    coverImage: string;
    vibeReason: string;
    genres: string[];
    estimatedFps: number;
  }[];
}

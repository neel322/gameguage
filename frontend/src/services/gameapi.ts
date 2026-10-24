import type { Game as AppGame } from '../types';

export interface FreeToGameRaw {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
  developer: string;
  release_date: string;
  freetogame_profile_url: string;
  minimum_system_requirements?: {
    os?: string;
    processor?: string;
    memory?: string;
    graphics?: string;
    storage?: string;
  };
}

export interface CheapSharkRaw {
  gameID: string;
  steamAppID?: string;
  cheapest: string;
  cheapestDealID: string;
  external: string;
  internalName: string;
  thumb: string;
}

const BASE_PROXY_URL = '/api-freetogame/api';

// In-memory cache to prevent re-fetching the heavy F2P catalogue repeatedly
let cachedF2PGames: AppGame[] | null = null;

export const mapFreeToGameToAppGame = (raw: FreeToGameRaw): AppGame => {
  const releaseYear = raw.release_date ? parseInt(raw.release_date.split('-')[0], 10) : new Date().getFullYear();

  return {
    id: String(raw.id),
    title: raw.title,
    slug: raw.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    coverImage: raw.thumbnail || '',
    releaseYear: isNaN(releaseYear) ? new Date().getFullYear() : releaseYear,
    genres: raw.genre ? [raw.genre] : ['Action'],
    shortDescription: raw.short_description || '',
    platform: raw.platform ? [raw.platform] : ['PC'],
    developer: raw.developer || 'Unknown',
    publisher: raw.publisher || 'Unknown',
    minimumRequirements: raw.minimum_system_requirements ? {
      os: raw.minimum_system_requirements.os || 'Windows 10',
      cpu: raw.minimum_system_requirements.processor || 'Intel Core i3 / AMD Equivalent',
      ram: raw.minimum_system_requirements.memory || '4 GB',
      gpu: raw.minimum_system_requirements.graphics || 'GeForce GTX 660 / AMD Radeon HD 7850',
      storage: raw.minimum_system_requirements.storage || '20 GB',
    } : undefined,
  } as unknown as AppGame;
};

export const mapCheapSharkToAppGame = (raw: CheapSharkRaw): AppGame => {
  return {
    id: `cs-${raw.gameID}`,
    title: raw.external,
    slug: raw.internalName.toLowerCase(),
    coverImage: raw.thumb || '',
    releaseYear: new Date().getFullYear(),
    genres: ['General'],
    shortDescription: `Best price: $${raw.cheapest}`,
    platform: ['PC'],
    developer: 'Unknown',
    publisher: 'Unknown',
    minimumRequirements: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i5 / AMD Ryzen 5',
      ram: '8 GB',
      gpu: 'DirectX 11 Compatible Video Card',
      storage: '40 GB',
    },
  } as unknown as AppGame;
};

export const fetchFreeToPlayGames = async (): Promise<AppGame[]> => {
  if (cachedF2PGames && cachedF2PGames.length > 0) {
    return cachedF2PGames;
  }

  const url = `${BASE_PROXY_URL}/games?platform=pc&sort-by=popularity`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: FreeToGameRaw[] = await res.json();
    cachedF2PGames = (data || []).map(mapFreeToGameToAppGame);
    return cachedF2PGames;
  } catch (err) {
    console.warn('[GameGauge API] FreeToGame request failed:', err);
    return cachedF2PGames || [];
  }
};

export const fetchGameDetails = async (id: number | string): Promise<AppGame | null> => {
  const url = `${BASE_PROXY_URL}/game?id=${id}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: FreeToGameRaw = await res.json();
    return mapFreeToGameToAppGame(data);
  } catch (err) {
    console.warn(`[GameGauge API] Failed to fetch game details for ID ${id}:`, err);
    return null;
  }
};

// Aliases for titles where abbreviations or popular names differ
const KNOWN_ALIASES: Record<string, string[]> = {
  pubg: ['battlegrounds', 'playerunknown'],
  battlegrounds: ['pubg'],
  gta: ['grand theft auto'],
  csgo: ['counter-strike', 'cs2'],
  cs2: ['counter-strike', 'csgo'],
  cod: ['call of duty', 'warzone'],
  warzone: ['call of duty', 'cod'],
};

export const searchCheapShark = async (query: string): Promise<AppGame[]> => {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const searchTerms = [clean];
  if (KNOWN_ALIASES[clean]) {
    searchTerms.push(...KNOWN_ALIASES[clean]);
  }

  try {
    const requests = searchTerms.map((term) =>
      fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(term)}&limit=15`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    );

    const results = await Promise.all(requests);
    const flattened: CheapSharkRaw[] = results.flat();

    const seen = new Set<string>();
    const unique: CheapSharkRaw[] = [];

    for (const item of flattened) {
      if (!seen.has(item.gameID)) {
        seen.add(item.gameID);
        unique.push(item);
      }
    }

    return unique.map(mapCheapSharkToAppGame);
  } catch (err) {
    console.warn('[GameGauge API] CheapShark search failed:', err);
    return [];
  }
};

export const externalGameService = {
  fetchFreeToPlayGames,
  fetchGameDetails,
  searchCheapShark,
  getGames: fetchFreeToPlayGames,
  getGameById: fetchGameDetails,
};

export default externalGameService;
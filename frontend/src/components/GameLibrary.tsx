import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Game } from '../types';
import { externalGameService } from '../services/gameapi';

interface GameLibraryProps {
  onSelectGameForCheck: (game: Game) => void;
}

const GENRE_OPTIONS = [
  'All Genres',
  'Action RPG',
  'Open World',
  'FPS',
  'Shooter',
  'Battle Royale',
  'Tactical Shooter',
  'MMORPG',
  'Racing',
  'Souls-like',
  'Adventure',
  'Horror',
  'Sports',
  'Simulation',
];

export const GameLibrary: React.FC<GameLibraryProps> = ({ onSelectGameForCheck }) => {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Marker reference right above the search box
  const searchMarkerRef = useRef<HTMLDivElement | null>(null);

  // Scroll listener for floating bottom-left button
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

  // Sync library directly with the live external API service
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    externalGameService.fetchFreeToPlayGames().then((fetched) => {
      if (isMounted) {
        setAllGames(fetched || []);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter with PUBG/Battlegrounds synonym mapping
  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allGames.filter((game) => {
      const titleLower = game.title.toLowerCase();
      let matchSearch = true;

      if (q) {
        const matchesTitle = titleLower.includes(q);
        const matchesTags = Array.isArray(game.tags) && game.tags.some((t) => t.toLowerCase().includes(q));
        const matchesDev = (game as any).developer?.toLowerCase().includes(q);
        const matchesSynonym =
          ((q === 'pubg' || q.includes('pubg')) && titleLower.includes('battlegrounds')) ||
          ((q === 'battlegrounds' || q.includes('battleground')) && titleLower.includes('pubg'));

        matchSearch = matchesTitle || matchesTags || matchesDev || matchesSynonym;
      }

      const matchGenre =
        genreFilter === 'All Genres' ||
        (Array.isArray(game.genres) && game.genres.includes(genreFilter));

      let matchTier = true;
      return matchSearch && matchGenre && matchTier;
    });
  }, [allGames, search, genreFilter]);

  // Tier badge colour
  const tierColor = (score: number) => {
    if (score > 10000) return 'text-error';
    if (score > 5000) return 'text-primary-container';
    if (score > 2500) return 'text-primary';
    return 'text-on-surface-variant';
  };

  return (
    <div className="relative w-full">
      <div className="w-full px-margin md:px-margin-tablet lg:px-margin-desktop max-w-7xl mx-auto py-space-xl flex flex-col gap-space-xl">
        {/* ── Hero Header ─────────────────────────── */}
        <div className="relative w-full rounded-xl bg-surface-container-low p-space-lg md:p-space-xl shadow-xl overflow-hidden">
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary-container/5 blur-3xl pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
          <div className="relative z-10 flex flex-col gap-space-md max-w-4xl">
            <div className="inline-flex items-center gap-space-xs self-start px-3 py-1 rounded bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse shadow-[0_0_6px_#38bdf8]" />
              <span>⚡ Live PC Gaming Catalog ({allGames.length}+ Titles)</span>
            </div>
            <div className="flex flex-col gap-space-xs">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight uppercase">
                Browse Game Requirements &amp; Benchmarks
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                Explore verified hardware requirement profiles for PC games. Click any title to immediately launch a compatibility diagnostic against your rig.
              </p>
            </div>
          </div>
        </div>

        {/* ── Marker Above Search ─────────────────── */}
        <div ref={searchMarkerRef} className="h-0 w-full" id="library-search-marker" />

        {/* ── Search + Filters ─────────────────────── */}
        <div className="flex flex-col gap-space-md">
          {/* Search bar */}
          <div className="relative w-full rounded-lg bg-surface-container-lowest shadow-md flex items-center px-space-md py-3 focus-within:shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all">
            <span className={`material-symbols-outlined text-primary text-[22px] mr-3 ${isLoading ? 'animate-spin' : ''}`}>
              {isLoading ? 'sync' : 'search'}
            </span>
            <input
              className="w-full bg-transparent font-body-md text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
              placeholder="Search by game name, publisher, engine, or tag (e.g., PUBG, Battlegrounds, Cyberpunk)..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-outline hover:text-on-surface transition-colors ml-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md p-space-md rounded-lg bg-surface-container-low">
            {/* Genre pills */}
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mr-1">Genre:</span>
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenreFilter(g)}
                  className={`px-3 py-1.5 rounded font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer ${
                    genreFilter === g
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

          
          </div>
        </div>

        {/* ── Game Grid ────────────────────────────── */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-space-xl text-on-surface-variant font-body-md text-body-md">
            No games found matching "{search}". Try another keyword.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg w-full">
            {filteredGames.map((game) => {
              const minGpuText =
                (game as any).minimumRequirements?.gpu ||
                (game as any).minGpu ||
                (game as any).minimumGpu ||
                'GTX 1060 6GB';

              const recGpuText =
                (game as any).recommended?.gpuName?.split('/')[0]?.trim() ||
                (game as any).recGpu ||
                (game as any).recommendedGpu ||
                'RTX 2060 Super';

              const recScore =
                (game as any).recommended?.gpuScore ||
                (game as any).recGpuScore ||
                6000;

              return (
                <div
                  key={game.id}
                  className="group flex flex-col rounded-xl bg-surface-container-low overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(56,189,248,0.2)] cursor-pointer"
                  onClick={() => onSelectGameForCheck(game)}
                >
                  {/* Cover Image */}
                  <div className="relative w-full h-48 bg-surface-container-high overflow-hidden">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent" />

                    {/* Dev badge (top-left) */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-lowest/80 backdrop-blur-md text-primary font-label-sm text-label-sm uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                      {(game as any).developer || 'Studio'}
                    </div>

                    {/* Year (top-right) */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-surface-container-high/90 text-on-surface font-label-sm text-label-sm">
                      {game.releaseYear}
                    </div>

                    {/* Genre tags + tech (bottom) */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {game.genres &&
                          game.genres.slice(0, 2).map((g) => (
                            <span key={g} className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                              {g}
                            </span>
                          ))}
                      </div>
                      {game.tags && game.tags[0] && (
                        <div className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm uppercase font-semibold">
                          {game.tags[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-space-md flex flex-col flex-1 justify-between gap-space-md">
                    <div className="flex flex-col gap-space-xs">
                      <h2 className="font-headline-md text-headline-md text-on-surface uppercase group-hover:text-primary transition-colors">
                        {game.title}
                      </h2>

                      {/* Requirement metrics */}
                      <div className="grid grid-cols-2 gap-space-xs mt-2 p-2 rounded bg-surface-container">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Min GPU</span>
                          <span className="font-body-md text-body-md text-on-surface truncate">{minGpuText}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Rec GPU</span>
                          <span className={`font-body-md text-body-md truncate ${tierColor(recScore)}`}>
                            {recGpuText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      className="w-full py-2.5 rounded bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(56,189,248,0.35)] hover:shadow-[0_0_20px_rgba(56,189,248,0.6)] transition-all cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGameForCheck(game);
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      <span>Test Compatibility on My Rig</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Legend card ──────────────────────────── */}
        <div className="w-full p-space-lg rounded-xl bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container shrink-0">
              <span className="material-symbols-outlined text-[28px]">biotech</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-body-lg text-body-lg text-on-surface font-semibold uppercase">How GameGauge Estimates Your FPS</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Predictions cross-reference your GPU wattage limit, CPU core throughput, and real-time benchmark data under 1080p / 1440p thermal constraints.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-md shrink-0">
            <span className="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-md text-label-md uppercase tracking-wider">
              {allGames.length} Games in Database
            </span>
          </div>
        </div>
      </div>

      {/* --- FLOATING UP-ARROW BUTTON (BOTTOM-LEFT ON MOBILE & LAPTOP) --- */}
      {showScrollTop && (
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

export default GameLibrary;
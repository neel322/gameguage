import React from 'react';
import type { UserProfile } from '../types';

export type NavTab = 'checker' | 'laptop-compare' | 'pc-builder' | 'games';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedRigsCount?: number;
  currentUser?: UserProfile | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenAuth,
}) => {
  return (
    <>
      {/* Top Main Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-surface-container-high/60 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="h-16 md:h-20 w-full px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo */}
          <div
            onClick={() => onSelectTab('checker')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-surface-container border border-primary-container/40 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.25)] group-hover:border-primary-container transition-all">
              <span className="material-symbols-outlined text-primary-container text-[18px] md:text-[20px]">
                speed
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-headline-md text-[18px] md:text-headline-md tracking-tight text-on-surface uppercase font-bold">
                  GAMEGAUGE
                </span>
                <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-primary-container text-[9px] md:text-label-sm border border-primary-container/30">
                  v2.4
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center p-1 rounded-lg bg-surface-container-low border border-surface-container-high/60 gap-1">
            <button
              type="button"
              onClick={() => onSelectTab('checker')}
              className={`px-3.5 py-1.5 rounded font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === 'checker'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Can I Run It
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('laptop-compare')}
              className={`px-3.5 py-1.5 rounded font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === 'laptop-compare'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Laptop Shopper
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('pc-builder')}
              className={`px-3.5 py-1.5 rounded font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === 'pc-builder'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              PC Builder
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('games')}
              className={`px-3.5 py-1.5 rounded font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === 'games'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Game Library
            </button>
          </nav>

          {/* Account / Rig Status Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-surface-container-high/80 text-on-surface text-label-sm md:text-label-md uppercase font-bold tracking-wider transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] md:text-[18px] text-primary-container">
                {currentUser?.defaultRig ? 'devices' : 'account_circle'}
              </span>
              <span className="max-w-[100px] truncate">
                {currentUser ? currentUser.username : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom HUD Navigation Dock */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={() => onSelectTab('checker')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition-all ${
            currentTab === 'checker' ? 'text-primary-container' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">speed</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Run It</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('laptop-compare')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition-all ${
            currentTab === 'laptop-compare' ? 'text-primary-container' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">laptop_chromebook</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Laptops</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('pc-builder')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition-all ${
            currentTab === 'pc-builder' ? 'text-primary-container' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">build</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">PC Build</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('games')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition-all ${
            currentTab === 'games' ? 'text-primary-container' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sports_esports</span>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Games</span>
        </button>
      </nav>
    </>
  );
};
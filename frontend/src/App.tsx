import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import type { NavTab } from './components/Navbar';
import { CompatibilityChecker } from './components/CompatibilityChecker';
import { LaptopComparison } from './components/LaptopComparison';
import { PCBuilder } from './components/PCBuilder';
import { GameLibrary } from './components/GameLibrary';
import { AuthModal } from './components/AuthModal';
import type { Game, UserProfile } from './types';
import { storageService } from './services/storage';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('checker');
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>(undefined);
  const [savedRigsCount, setSavedRigsCount] = useState<number>(1);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => storageService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const rigs = storageService.getSavedRigs();
    setSavedRigsCount(rigs.length);
  }, [currentUser]);

  const handleSelectGameFromLibrary = (game: Game) => {
    setSelectedGameId(game.id);
    setCurrentTab('checker');
  };

  const handleNavigateToLaptopCompare = () => {
    setCurrentTab('laptop-compare');
  };

  const handleNavigateToPCBuilder = () => {
    setCurrentTab('pc-builder');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'checker') {
            setSelectedGameId(undefined); // Reset so Step 1 (Select Game) opens cleanly
          }
          setCurrentTab(tab);
        }}
        savedRigsCount={savedRigsCount}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-20 bg-background">
        {currentTab === 'checker' && (
          <CompatibilityChecker
            initialGameId={selectedGameId}
            onNavigateToLaptopCompare={handleNavigateToLaptopCompare}
            onNavigateToPCBuilder={handleNavigateToPCBuilder}
            userProfile={currentUser}
          />
        )}

        {currentTab === 'laptop-compare' && (
          <LaptopComparison userProfile={currentUser} />
        )}

        {currentTab === 'pc-builder' && (
          <PCBuilder />
        )}

        {currentTab === 'games' && (
          <GameLibrary
            onSelectGameForCheck={handleSelectGameFromLibrary}
          />
        )}
      </main>

      {/* Auth / Rig Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(user) => setCurrentUser(user)}
      />

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high/60 py-space-xl mt-space-xl">
        <div className="w-full px-margin md:px-margin-tablet lg:px-margin-desktop max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-lg">
          <div className="flex flex-col items-center md:items-start gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-md text-headline-md text-on-surface tracking-tight uppercase">GAMEGAUGE</span>
              <span className="font-label-sm text-label-sm text-primary-container px-1.5 py-0.5 rounded bg-surface-container">v2.4 HUD</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">
              Clinical Hardware Diagnostics &amp; Pre-Purchase Telemetry Matrix
            </p>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs px-3 py-1.5 rounded bg-surface-container-low border border-surface-container">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {storageService.isSupabaseConfigured() ? 'Cloud Database Synced' : 'Local Storage Active'}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline hidden sm:block">
              Crafted for Precision Hardware Enthusiasts
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
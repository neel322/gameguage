import React, { useState, useMemo } from 'react';
import type { UserProfile, UserRigSpecs } from '../types';
import { storageService } from '../services/storage';
import { LAPTOPS, LAPTOP_BRANDS, getLaptopsByBrand } from '../data/laptops';
import { CPUS, GPUS } from '../data/hardware';

interface AuthModalProps {
  isOpen?: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onUserChange?: (user: UserProfile | null) => void;
  onSuccess?: (user: UserProfile) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,24}$/;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  onClose,
  currentUser,
  onUserChange,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [authMode, setAuthMode] = useState<'signup' | 'signin' | 'manage'>(() => {
    return currentUser ? 'manage' : 'signup';
  });

  const [signupStep, setSignupStep] = useState<'info' | 'device-choice' | 'device-form'>('info');

  const [username, setUsername] = useState<string>(currentUser?.username || '');
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Device Form States
  const [deviceType, setDeviceType] = useState<'laptop' | 'desktop'>('laptop');

  // Laptop Selection
  const [laptopBrand, setLaptopBrand] = useState<string>(LAPTOP_BRANDS[0] || 'Lenovo');
  const [laptopModelId, setLaptopModelId] = useState<string>(() => {
    const list = getLaptopsByBrand(LAPTOP_BRANDS[0] || 'Lenovo');
    return list[0]?.id || LAPTOPS[0]?.id || '';
  });

  const selectedLaptop = useMemo(() => {
    return LAPTOPS.find((l) => l.id === laptopModelId) || LAPTOPS[0];
  }, [laptopModelId]);

  // Desktop Selection
  const desktopCpus = useMemo(() => CPUS.filter((c) => c.platform === 'desktop'), []);
  const desktopGpus = useMemo(() => GPUS.filter((g) => g.platform === 'desktop'), []);

  const [desktopCpuId, setDesktopCpuId] = useState<string>(desktopCpus[0]?.id || 'cpu-r5-5600');
  const [desktopGpuId, setDesktopGpuId] = useState<string>(desktopGpus[0]?.id || 'gpu-rx-6600');
  const [desktopRamGb, setDesktopRamGb] = useState<number>(16);

  const selectedDesktopCpu = useMemo(() => {
    return desktopCpus.find((c) => c.id === desktopCpuId) || desktopCpus[0];
  }, [desktopCpus, desktopCpuId]);

  const selectedDesktopGpu = useMemo(() => {
    return desktopGpus.find((g) => g.id === desktopGpuId) || desktopGpus[0];
  }, [desktopGpus, desktopGpuId]);

  const validateCredentials = (isSigningIn = false): boolean => {
    setErrorMsg('');
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (isSigningIn) {
      if (!cleanUsername && !cleanEmail) {
        setErrorMsg('Please enter your username or email address.');
        return false;
      }
      return true;
    }

    if (!cleanUsername) {
      setErrorMsg('Username is required.');
      return false;
    }

    if (!USERNAME_REGEX.test(cleanUsername)) {
      setErrorMsg('Username must be 3–24 characters and only contain letters, numbers, hyphens, or underscores.');
      return false;
    }

    if (!cleanEmail) {
      setErrorMsg('Email address is required.');
      return false;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@domain.com).');
      return false;
    }

    return true;
  };

  const handleCompleteRegistration = async (rig: UserRigSpecs | null) => {
    const finalUsername = username.trim();
    const finalEmail = email.trim();

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updatedUser = await storageService.loginOrCreateUser(finalUsername, finalEmail, rig);

      if (onUserChange) onUserChange(updatedUser);
      if (onSuccess) onSuccess(updatedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign In: strictly checks for existing users, never creates accounts on failure
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredentials(true)) return;

    setIsSubmitting(true);
    setErrorMsg('');

    const inputVal = (username.trim() || email.trim()).toLowerCase();

    try {
      // 1. Check database for existing account
      let existingUser: UserProfile | null = null;
      if (storageService.isSupabaseConfigured()) {
        existingUser = await storageService.fetchExistingUser(inputVal);
      }

      // 2. Fall back to local storage if offline or not in DB
      if (!existingUser) {
        const local = storageService.getCurrentUser();
        if (local && (local.email.toLowerCase() === inputVal || local.username.toLowerCase() === inputVal)) {
          existingUser = local;
        }
      }

      // 3. User does not exist -> REJECT with error
      if (!existingUser) {
        setErrorMsg('No account found with that username or email. Please check your spelling or sign up.');
        setIsSubmitting(false);
        return;
      }

      // 4. User exists -> Log them in cleanly
      storageService.setCurrentUser(existingUser);
      if (onUserChange) onUserChange(existingUser);
      if (onSuccess) onSuccess(existingUser);
      onClose();
    } catch {
      setErrorMsg('Unable to verify credentials. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWithDevice = async () => {
    let rigSpecs: UserRigSpecs;

    if (deviceType === 'laptop') {
      rigSpecs = {
        isLaptop: true,
        cpuName: selectedLaptop.cpuName,
        cpuScore: selectedLaptop.cpuScore,
        gpuName: selectedLaptop.gpuName,
        gpuScore: selectedLaptop.gpuScore,
        vramGb: selectedLaptop.vramGb,
        ramGb: selectedLaptop.ramGb,
        storageGb: 512,
        isSsd: true,
        laptopBrand: selectedLaptop.brand,
        laptopModelId: selectedLaptop.id,
      };
    } else {
      rigSpecs = {
        isLaptop: false,
        cpuName: selectedDesktopCpu.name,
        cpuScore: selectedDesktopCpu.score,
        gpuName: selectedDesktopGpu.name,
        gpuScore: selectedDesktopGpu.score,
        vramGb: selectedDesktopGpu.vramGb || 8,
        ramGb: desktopRamGb,
        storageGb: 1000,
        isSsd: true,
      };
    }

    await handleCompleteRegistration(rigSpecs);
  };

  const handleSignOut = () => {
    storageService.setCurrentUser(null);
    if (onUserChange) onUserChange(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-container-low rounded-xl shadow-2xl p-space-lg border border-surface-container-high/80 text-on-surface">
        {/* Header */}
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/60">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary-container text-[24px]">terminal</span>
            <span className="font-headline-md text-headline-md uppercase text-on-surface font-bold">
              {authMode === 'manage'
                ? 'Account & Rig Settings'
                : authMode === 'signin'
                ? 'Sign In to GameGauge'
                : signupStep === 'info'
                ? 'Create Your Account'
                : signupStep === 'device-choice'
                ? 'Hardware Setup'
                : 'Configure Your Rig'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded bg-error-container/20 border border-error/40 text-error text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= ALREADY LOGGED IN ================= */}
        {authMode === 'manage' && currentUser && (
          <div className="mt-space-md flex flex-col gap-space-md">
            <div className="p-space-md rounded-lg bg-surface-container border border-surface-container-high/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase text-outline">Database Profile</span>
                <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary-container font-label-sm uppercase font-semibold">
                  Synced
                </span>
              </div>
              <div className="text-headline-md font-bold text-on-surface">{currentUser.username}</div>
              <div className="text-body-sm text-on-surface-variant font-mono">{currentUser.email}</div>
            </div>

            <div className="p-space-md rounded-lg bg-surface-container border border-surface-container-high/60 flex flex-col gap-2">
              <span className="font-label-sm text-label-sm uppercase text-outline">Primary Hardware Configuration</span>
              {currentUser.defaultRig ? (
                <div className="flex flex-col gap-1 text-body-sm">
                  <span className="font-bold text-primary-container">
                    {currentUser.defaultRig.isLaptop ? 'Laptop:' : 'Desktop PC:'}{' '}
                    {currentUser.defaultRig.gpuName}
                  </span>
                  <span className="text-on-surface-variant">
                    {currentUser.defaultRig.cpuName} • {currentUser.defaultRig.ramGb}GB RAM
                  </span>
                </div>
              ) : (
                <div className="text-body-sm text-on-surface-variant italic">
                  No primary rig linked. You can browse, build PCs, and test games freely[cite: 3].
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/40 gap-space-sm">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setSignupStep('device-form');
                }}
                className="px-4 py-2 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm uppercase font-semibold transition-colors cursor-pointer"
              >
                {currentUser.defaultRig ? 'Reconfigure Rig' : 'Add Hardware Rig'}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 rounded bg-error-container/20 text-error hover:bg-error-container/40 font-label-sm uppercase font-semibold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* ================= SIGN IN ================= */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="mt-space-md flex flex-col gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase text-outline">Username or Email</label>
              <input
                type="text"
                placeholder="Enter your registered username or email"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md border border-surface-container-high/60 focus:border-primary-container focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-headline-md font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className="text-center pt-2 border-t border-surface-container-high/40 text-body-sm text-on-surface-variant">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setSignupStep('info');
                  setUsername('');
                  setEmail('');
                  setErrorMsg('');
                }}
                className="text-primary-container hover:underline font-semibold cursor-pointer ml-1"
              >
                Create an account
              </button>
            </div>
          </form>
        )}

        {/* ================= SIGN UP WIZARD ================= */}
        {authMode === 'signup' && (
          <div className="mt-space-md flex flex-col gap-space-md">
            {/* STEP 1: Basic Info */}
            {signupStep === 'info' && (
              <div className="flex flex-col gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-label-sm text-label-sm uppercase text-outline">Choose a Username</label>
                    <span className="text-[11px] text-outline font-mono">Min 3 chars</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. CyberSamurai_01"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md border border-surface-container-high/60 focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-label-sm text-label-sm uppercase text-outline">Email Address</label>
                    <span className="text-[11px] text-outline font-mono">Actual email address</span>
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. player@domain.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md border border-surface-container-high/60 focus:border-primary-container focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (validateCredentials(false)) {
                      setSignupStep('device-choice');
                    }
                  }}
                  className="w-full py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-headline-md font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Continue</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                <div className="text-center pt-2 border-t border-surface-container-high/40 text-body-sm text-on-surface-variant">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setUsername('');
                      setEmail('');
                      setErrorMsg('');
                    }}
                    className="text-primary-container hover:underline font-semibold cursor-pointer ml-1"
                  >
                    Sign in here
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Device Choice */}
            {signupStep === 'device-choice' && (
              <div className="flex flex-col gap-space-md">
                <div className="text-center py-2">
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold uppercase">
                    Do you have a Gaming Laptop or PC?
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    If you don&apos;t have one yet, you can create your account right now and explore games, build virtual rigs, and compare laptops freely[cite: 3].
                  </p>
                </div>

                <div
                  onClick={() => setSignupStep('device-form')}
                  className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high/60 hover:border-primary-container/80 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-space-md">
                    <div className="w-12 h-12 rounded-lg bg-primary-container/20 text-primary-container flex items-center justify-center shrink-0 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                      <span className="material-symbols-outlined text-[26px]">devices</span>
                    </div>
                    <div>
                      <div className="font-headline-md text-body-lg font-bold text-on-surface">
                        Yes, I have a Laptop or PC
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        Link your specs to enable 1-click FPS checks &amp; bottleneck telemetry.
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </div>

                <div
                  onClick={() => handleCompleteRegistration(null)}
                  className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high/60 hover:border-primary-container/80 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-space-md">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-highest text-on-surface-variant flex items-center justify-center shrink-0 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                      <span className="material-symbols-outlined text-[26px]">person</span>
                    </div>
                    <div>
                      <div className="font-headline-md text-body-lg font-bold text-on-surface">
                        No / Skip for now
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        Create my account directly without hardware specifications.
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    arrow_forward
                  </span>
                </div>

                <div className="pt-2 border-t border-surface-container-high/40 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setSignupStep('info')}
                    className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-label-sm uppercase cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                    <span>Back</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Configure Device Details */}
            {signupStep === 'device-form' && (
              <div className="flex flex-col gap-space-md">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-surface-container-lowest border border-surface-container-high/60">
                  <button
                    type="button"
                    onClick={() => setDeviceType('laptop')}
                    className={`py-2 rounded font-label-md uppercase font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      deviceType === 'laptop'
                        ? 'bg-surface-container-high text-primary-container shadow-sm border border-primary-container/30'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">laptop_mac</span>
                    Gaming Laptop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceType('desktop')}
                    className={`py-2 rounded font-label-md uppercase font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      deviceType === 'desktop'
                        ? 'bg-surface-container-high text-primary-container shadow-sm border border-primary-container/30'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
                    Desktop PC
                  </button>
                </div>

                {deviceType === 'laptop' && (
                  <div className="flex flex-col gap-3 p-space-sm rounded-lg bg-surface-container border border-surface-container-high/40">
                    <div>
                      <label className="block font-label-sm text-label-sm uppercase text-outline mb-1.5">
                        Brand
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {LAPTOP_BRANDS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              setLaptopBrand(b);
                              const list = getLaptopsByBrand(b);
                              if (list[0]) setLaptopModelId(list[0].id);
                            }}
                            className={`py-1 rounded font-label-sm font-bold uppercase transition-all cursor-pointer border ${
                              laptopBrand === b
                                ? 'bg-primary-container text-on-primary-container border-primary-container'
                                : 'bg-surface-container-lowest text-on-surface border-surface-container-high/50 hover:bg-surface-container-high'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                        Laptop Model
                      </label>
                      <select
                        value={laptopModelId}
                        onChange={(e) => setLaptopModelId(e.target.value)}
                        className="w-full h-10 px-2.5 rounded bg-surface-container-lowest text-on-surface font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none appearance-none cursor-pointer"
                      >
                        {getLaptopsByBrand(laptopBrand).map((l) => (
                          <option key={l.id} value={l.id} className="bg-surface-container-lowest text-on-surface">
                            {l.fullName} ({l.gpuName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-2 rounded bg-surface-container-lowest border border-surface-container-high/40 text-body-sm flex justify-between">
                      <span className="text-outline">Specs:</span>
                      <span className="text-on-surface font-semibold truncate max-w-[280px]">
                        {selectedLaptop.gpuName} • {selectedLaptop.cpuName} • {selectedLaptop.ramGb}GB
                      </span>
                    </div>
                  </div>
                )}

                {deviceType === 'desktop' && (
                  <div className="flex flex-col gap-3 p-space-sm rounded-lg bg-surface-container border border-surface-container-high/40">
                    <div>
                      <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                        Graphics Card (GPU)
                      </label>
                      <select
                        value={desktopGpuId}
                        onChange={(e) => setDesktopGpuId(e.target.value)}
                        className="w-full h-10 px-2.5 rounded bg-surface-container-lowest text-on-surface font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none appearance-none cursor-pointer"
                      >
                        {desktopGpus.map((g) => (
                          <option key={g.id} value={g.id} className="bg-surface-container-lowest text-on-surface">
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                        Processor (CPU)
                      </label>
                      <select
                        value={desktopCpuId}
                        onChange={(e) => setDesktopCpuId(e.target.value)}
                        className="w-full h-10 px-2.5 rounded bg-surface-container-lowest text-on-surface font-body-sm border border-surface-container-high/60 focus:border-primary-container focus:outline-none appearance-none cursor-pointer"
                      >
                        {desktopCpus.map((c) => (
                          <option key={c.id} value={c.id} className="bg-surface-container-lowest text-on-surface">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                        RAM (GB)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[8, 16, 32, 64].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setDesktopRamGb(size)}
                            className={`py-1.5 rounded font-label-sm font-bold uppercase transition-all cursor-pointer ${
                              desktopRamGb === size
                                ? 'bg-primary-container text-on-primary-container'
                                : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container-high/60 hover:text-on-surface'
                            }`}
                          >
                            {size}GB
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/40">
                  <button
                    type="button"
                    onClick={() => setSignupStep('device-choice')}
                    className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-label-sm uppercase cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveWithDevice}
                    className="px-5 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-headline-md font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Rig & Complete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, UserRigSpecs } from '../types';

const STORAGE_KEYS = {
  USER: 'gamegauge_user',
  SAVED_RIGS: 'gamegauge_saved_rigs',
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const storageService = {
  isSupabaseConfigured(): boolean {
    return Boolean(supabase);
  },

  getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: UserProfile | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch {
      // ignore
    }
  },

  getSavedRigs(): UserRigSpecs[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_RIGS);
      if (raw) return JSON.parse(raw);

      const user = this.getCurrentUser();
      return user?.defaultRig ? [user.defaultRig] : [];
    } catch {
      return [];
    }
  },

  saveRig(rig: UserRigSpecs): void {
    try {
      const rigs = this.getSavedRigs();
      const updated = [rig, ...rigs.filter(r => r.gpuName !== rig.gpuName || r.cpuName !== rig.cpuName)];
      localStorage.setItem(STORAGE_KEYS.SAVED_RIGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  // Record live telemetry check to rig_checks table matching database DDL
  async logRigCheck(
    gameId: string,
    gameTitle: string,
    rig: UserRigSpecs,
    fps: number,
    score: number,
    tier: string = 'Playable'
  ): Promise<void> {
    if (!supabase) return;

    try {
      const hardwareSummary = `${rig.gpuName} • ${rig.cpuName} • ${rig.ramGb}GB RAM`;

      const checkRecord = {
        game_id: gameId,
        game_title: gameTitle,
        hardware_summary: hardwareSummary,
        is_laptop: Boolean(rig.isLaptop),
        score: Math.round(Number(score) || 0),
        tier: tier,
        fps_estimate: Math.round(Number(fps) || 0),
        checked_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('rig_checks').insert(checkRecord);
      if (error) {
        console.warn('[GameGauge] rig_checks insert warning:', error.message, error.details || '');
      }
    } catch (err) {
      console.warn('[GameGauge] rig_checks table exception:', err);
    }
  },

  // Look up existing user by email or username
  async fetchExistingUser(identifier: string): Promise<UserProfile | null> {
    if (!supabase) return null;

    try {
      const clean = identifier.trim().toLowerCase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.${clean},username.ilike.${clean}`)
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      let parsedRig: UserRigSpecs | undefined = undefined;
      if (data.default_rig) {
        try {
          parsedRig = typeof data.default_rig === 'string' ? JSON.parse(data.default_rig) : data.default_rig;
        } catch {
          // ignore parsing error
        }
      }

      const fetchedProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        rigName: data.rig_name || 'Primary Rig',
        createdAt: data.created_at,
        ...(parsedRig ? { defaultRig: parsedRig } : {}),
      };

      return fetchedProfile as unknown as UserProfile;
    } catch {
      return null;
    }
  },

  // Register or sign in a user, syncing profiles & user_devices
  async loginOrCreateUser(
    username: string,
    email: string,
    rig: UserRigSpecs | null
  ): Promise<UserProfile> {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists in database or locally
    let existingProfile: UserProfile | null = null;
    if (supabase) {
      existingProfile = await this.fetchExistingUser(trimmedEmail);
      if (!existingProfile) {
        existingProfile = await this.fetchExistingUser(trimmedUsername);
      }
    }

    if (!existingProfile) {
      const local = this.getCurrentUser();
      if (local && (local.email.toLowerCase() === trimmedEmail || local.username.toLowerCase() === trimmedUsername)) {
        existingProfile = local;
      }
    }

    let profile: UserProfile;

    if (existingProfile) {
      const updatedProfileData = {
        id: existingProfile.id,
        username: existingProfile.username,
        email: existingProfile.email,
        rigName: rig
          ? (rig.isLaptop ? (rig.laptopBrand || 'Gaming Laptop') : 'Custom Desktop')
          : existingProfile.rigName,
        createdAt: existingProfile.createdAt,
        ...(rig ? { defaultRig: rig } : existingProfile.defaultRig ? { defaultRig: existingProfile.defaultRig } : {}),
      };
      profile = updatedProfileData as unknown as UserProfile;
    } else {
      const newProfileData = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        username: trimmedUsername,
        email: trimmedEmail,
        rigName: rig ? (rig.isLaptop ? (rig.laptopBrand || 'Gaming Laptop') : 'Custom Desktop') : 'No Primary Rig',
        createdAt: new Date().toISOString(),
        ...(rig ? { defaultRig: rig } : {}),
      };
      profile = newProfileData as unknown as UserProfile;
    }

    // 1. Persist locally
    this.setCurrentUser(profile);
    if (rig) {
      this.saveRig(rig);
    }

    // 2. Database Sync
    if (supabase) {
      try {
        // Step A: Upsert into profiles table
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: profile.id,
          username: profile.username,
          email: profile.email,
          rig_name: profile.rigName,
          created_at: profile.createdAt,
          default_rig: profile.defaultRig ? JSON.stringify(profile.defaultRig) : null,
        }, { onConflict: 'email' });

        if (profileError) {
          console.warn('[GameGauge] profiles sync warning:', profileError.message, profileError.details || '');
        }

        // Step B: Insert into user_devices matching your schema definition
        if (rig) {
          const deviceName = rig.isLaptop
            ? (rig.laptopBrand || 'Gaming Laptop')
            : 'Custom Desktop PC';

          const devicePayload = {
            user_id: profile.id,
            device_name: deviceName,
            device_type: rig.isLaptop ? 'laptop' : 'desktop',
            specs: rig, // <-- satisfying 'specs jsonb not null'
            is_primary: true,
            is_active: true,
            gpu_name: rig.gpuName,
            cpu_name: rig.cpuName,
            ram_gb: Math.round(Number(rig.ramGb) || 16),
            vram_gb: Math.round(Number(rig.vramGb) || 6),
            created_at: new Date().toISOString(),
          };

          const { error: deviceError } = await supabase.from('user_devices').insert(devicePayload);
          if (deviceError) {
            console.warn('[GameGauge] user_devices insert warning:', deviceError.message, deviceError.details || '');
          }
        }
      } catch (err) {
        console.warn('[GameGauge] Database synchronization exception:', err);
      }
    }

    return profile;
  },
};
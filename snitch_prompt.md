# GameGauge — Snitch Frontend Prompt

---

## What is GameGauge?

GameGauge is a **dark-themed PC and laptop gaming diagnostics web application**. It lets users:

1. Check if a game will run on their PC or laptop ("Can I Run It?").
2. Compare multiple laptop models side-by-side before buying one.
3. Virtually build a custom desktop PC and see which games it runs best.
4. Browse a game library catalog with system requirement profiles.

Users can sign in and save their hardware profile (laptop model or custom desktop build). Once signed in, their rig is automatically used across all tools — no re-typing specs every time.

---

## Tech Stack

- **React 19 + TypeScript** (Vite build)
- **Tailwind CSS** (dark custom theme)
- **Supabase** (user database — only stores user accounts, their saved devices/rigs, and test history; NOT the game/hardware/laptop catalogs)
- **Lucide React** (all icons)
- **canvas-confetti** (celebration on perfect compatibility result)

---

## Color Palette / Design Language

The app uses a **deep space dark gaming aesthetic**:

| Token | Value | Use |
|---|---|---|
| `gauge-dark` | `#0a0d14` | Main page background |
| `gauge-card` | `#111726` | Card / panel background |
| `gauge-neonCyan` | `#00f2fe` | Primary accent, active state, FPS numbers |
| `gauge-neonPurple` | `#8b5cf6` | Laptop Shopper accent |
| `gauge-neonGreen` | `#10b981` | Pass / compatible state |
| `gauge-neonOrange` | `#f59e0b` | Warning / mid-tier state |
| `gauge-neonRed` | `#ef4444` | Fail / incompatible state |

All cards use a `glass-panel` style: semi-transparent dark background (`bg-slate-900/80`) + `backdrop-blur-md` + border (`border-slate-800`).

Neon glow box-shadows are used on active cards:
- Cyan glow: `0 0 20px -5px rgba(0, 242, 254, 0.4)`
- Purple glow: `0 0 20px -5px rgba(139, 92, 246, 0.4)`
- Green glow: `0 0 20px -5px rgba(16, 185, 129, 0.4)`
- Red glow: `0 0 20px -5px rgba(239, 68, 68, 0.4)`

---

## Navigation (Sticky Top Navbar)

The sticky top navbar contains:

- **Left**: GameGauge logo (Gauge icon in a neon cyan/purple gradient square) + text `GAMEGAUGE v2.0` + subtitle `PC & Laptop Gaming Diagnostics & Pre-Purchase Engine`
- **Center**: Tab navigation bar (pill-shaped, dark background):
  - `Gauge icon` **Can I Run It?** → Cyan/blue active highlight
  - `Laptop icon` **Laptop Shopper** → Purple/pink active highlight
  - `Cpu icon` **PC Builder** → Emerald/teal active highlight
  - `Library icon` **Game Library** → Amber/orange active highlight
- **Right**: 
  - If Supabase is connected: `CloudCheck` icon badge in cyan
  - If not connected: `HardDrive` icon badge
  - User profile button: Shows avatar/initial pill if signed in, or `Sign In` button if not

---

## Page 1 — "Can I Run It?" (CompatibilityChecker)

This is the main feature page. The user selects a game, inputs their hardware specs, and gets a detailed compatibility diagnostic.

### Left Column — Configuration Panel

**Section 1 — Game Selector:**
- Large searchable game selector with cover image thumbnail
- Shows game title, genre, release year, developer
- Typing filters by title, genre, or tags in real time

**Section 2 — Hardware Mode Toggle:**
- Two large buttons: `💻 Laptop` / `🖥️ Desktop (Custom Build)`
- If user is signed in, their rig is pre-filled and locked with a banner: `"Using your saved rig: [Rig Name] — Change in Profile"`

**Laptop Mode sub-panel:**
- Brand picker buttons: Lenovo, ASUS, HP, Acer, Dell, MSI, Apple, Razer (each as a small toggle button)
- Laptop model dropdown (filters by selected brand)
- Specs auto-fill from catalog: CPU name, GPU name, RAM, VRAM, display

**Desktop Mode sub-panel — 7 Essential Parts:**
1. **Graphics Card (GPU)** — dropdown of desktop GPUs with VRAM labels
2. **Processor (CPU)** — dropdown of desktop CPUs with benchmark scores
3. **Memory (RAM)** — 8GB / 16GB / 32GB / 64GB selector
4. **Storage (NVMe M.2 SSD)** — 500GB / 1TB / 2TB / 4TB
5. **CPU Cooler** — dropdown (air tower vs AIO liquid)
6. **PC Case (Airflow)** — dropdown with airflow rating
7. **Gaming Monitor** — dropdown (1080p/1440p/4K, Hz rate)

**Section 3 — Resolution Target:**
- 1080p / 1440p / 4K toggle buttons

**CTA Button:** Big glowing `⚡ Run Compatibility Diagnostic` button (full width, cyan gradient)

**Recent Checks sidebar** (collapsible): Shows last 5 checks as small history rows

---

### Right Column — Results Panel (shows after running check)

**1. Speedometer Gauge (SVG animated arc):**
- Semi-circle gauge (0–100 score)
- Needle animates to score
- Color: Red (0–44) → Amber (45–64) → Green (65–84) → Cyan (85–100)
- Below: Large score number, tier label (e.g. `🔥 ULTRA READY` / `✅ RECOMMENDED` / `⚠️ MINIMUM MET` / `❌ CANNOT RUN`)

**2. FPS Estimate Table:**
- 1080p Low / 1080p Medium / 1080p High / 1080p Ultra / 1440p Medium
- Each shown as a colored pill: Green ≥60fps, Amber 30–59fps, Red <30fps

**3. Component Check Grid (4 cards):**
- CPU / GPU / RAM / VRAM
- Each card shows: icon, component name from user's rig, comparison bar, status (PASS/WARN/FAIL)

**4. Bottleneck Analysis:**
- Which component is the weakest link and by how much
- Upgrade suggestion: specific recommended upgrade part with estimated FPS improvement

**5. Similar Lighter Games (if cannot run):**
- 3 alternative games the user CAN run, in the same genre/vibe
- Shows cover image thumbnail, title, reason why it's similar, estimated FPS on their rig

**6. Desktop PC only — 3 Diagnostic Cards (right column extras):**
- CPU Cooler thermal diagnostic (check if cooler TDP handles CPU TDP)
- Case airflow diagnostic
- Monitor refresh rate vs FPS pacing diagnostic

---

## Page 2 — Laptop Shopper (LaptopComparison)

Side-by-side laptop comparison benchmarked against a target game.

### Header Panel (`relative z-10` — important for dropdown layering!)

Left side:
- Title: `Compare Laptops Before You Buy`
- Subtitle: `Pick any game and compare laptop models side-by-side.`

Right side — **Benchmark Target Game Selector (Inline, Never Modal):**
- Label: `Benchmark Target Game` + count of available titles
- **Directly embedded search input** (no popup/modal — the search bar is ALWAYS visible in the card)
- Below search: A "currently active game" display strip (thumbnail + title + genre + year)
- **Results dropdown:** appears `absolute top-full` directly underneath the search input, `z-50`, scrollable list of all matching games. **Never goes behind any element below — header panel must have `relative z-10`**

### Action Bar

- `+ Add Laptop to Compare (N/4)` button (purple)
- Quick preset combo buttons: `Budget RTX 4050 ($800)`, `RTX 4060 Sweet-Spot ($950)`
- `Clear All` button if laptops are added

### Comparison Workspace

**If 0 laptops selected (blank state):**
- Large centered empty state panel
- Shows message: `Comparison Workspace is Blank`
- Context message: If user has a desktop, says `"You are on Desktop PC — add laptops to compare"`; if guest, shows generic add prompt
- 3 empty slot cards: `+ Add Laptop #1`, `+ Add Laptop #2`, `+ Add Laptop #3` (each clickable to open add modal)

**If user is signed in with a laptop:**
- Their laptop auto-loads as the first column with a `👑 Your Active Laptop` emerald badge

**If 1–4 laptops added:**
- Responsive grid: 1 col → 2 col → 3 col → 4 col based on count
- Each **laptop card** shows:
  - Badges: `🏆 Best Value` (purple) and/or `⚡ Top FPS` (cyan) if applicable; `✨ Your Active Laptop` (emerald) for user's own
  - Remove button (× top right)
  - Brand • Series label
  - Laptop model name
  - Price (large cyan) or `Owned (Your Rig)` for user's own
  - Game run status banner (green/amber/red pill)
  - Gauge score bar
  - FPS estimates at 1080p Low/Med/High/Ultra
  - Hardware specs tags: GPU, CPU, RAM, VRAM
  - Display info
  - FPS-per-$100 value score (for pricing comparison)

**+ Add Another Laptop** inline slot card appears inside the grid when fewer than 4 laptops are present.

### Add Laptop Modal

Modal with two tabs:
- **From Catalog** — Brand picker buttons (Lenovo/ASUS/HP/Acer/Dell/MSI/Apple/Razer) + model dropdown
- **Manual / Custom** — Full form: Brand text, Model name, Price, CPU dropdown, GPU dropdown, RAM, VRAM, Display string, TGP Watts

---

## Page 3 — PC Builder (PCBuilder)

Custom desktop PC build tool. Configure 7 parts, see live cost and which games run on it.

### Left Column — Build Configuration

7 dropdown selectors:
1. **Graphics Card (GPU)** with VRAM and price
2. **Processor (CPU)** with benchmark score and price
3. **Memory (RAM)** — 8/16/32/64GB
4. **Storage (NVMe M.2 SSD)** — 500GB/1TB/2TB/4TB with read speed labels
5. **CPU Cooler** — with max TDP rating
6. **PC Case** — with airflow fan count
7. **Gaming Monitor** — resolution, refresh rate, panel type, price

**Build Cost Summary Card:**
- System Only total (CPU+GPU+RAM+Storage+Cooler+Case+Motherboard+PSU estimate)
- Full Setup total (+ Monitor)
- Itemized parts list
- `Reset Build` button

**Diagnostics Cards (3):**
- CPU vs GPU Bottleneck percentage + colored bar (green = balanced, amber = mild, red = bad)
- Cooler thermal adequacy (PASS/FAIL: can cooler handle CPU's TDP?)
- Case airflow rating

### Right Column — Game Benchmark Matrix

Title: `Games Ranked for Your Build`

Controls:
- Search bar (filter games by title/genre)
- Genre filter dropdown
- Sort toggle: `Best Running First ↓` / `Lowest FPS First ↑`

Game list cards (sorted descending by FPS by default):
Each game row shows:
- Cover image thumbnail
- Game title + genre tags
- Estimated FPS at 1080p High (large number, color-coded)
- Playability tier pill: `ULTRA READY` / `RECOMMENDED` / `MINIMUM MET` / `CANNOT RUN`
- Monitor compatibility: warns if monitor refresh rate exceeds estimated FPS (display clip alert)
- Compatibility gauge mini-bar

---

## Page 4 — Game Library (GameLibrary)

Browsable catalog of all games in the database.

### Header
- Title: `Browse Game Requirements & Benchmarks`
- Filter row:
  - Search by game name or tag
  - Genre dropdown filter
  - Hardware tier filter: `All` / `Light (Integrated/Old GPU)` / `Mid-Range (GTX 1060–RTX 3060)` / `Demanding (RTX 3070+)`

### Game Grid (Responsive, 2–4 columns)

Each game card:
- Cover image (full-width top, with genre overlay tag)
- Title, developer, release year
- Min GPU required (named)
- Recommended GPU (named)
- Genre tags (pill badges)
- `▶ Check on My Rig` button → navigates to Can I Run It page pre-loaded with this game

---

## Auth Modal (Sign In / Profile Management)

**Not signed in:**
- Email field + Gamer Username field
- Rig type toggle: `💻 I Play on a Laptop` / `🖥️ I Play on a Desktop PC`
- Rig nickname field (optional)
- **Laptop flow**: Brand picker buttons → laptop model dropdown
- **Desktop flow**: All 7 essential parts droppers (CPU, GPU, RAM, Storage, Cooler, Case, Monitor)
- Submit: `Save Rig & Start Playing →`

**Signed in:**
- Account summary (username + email + "Database Synced" badge)
- **"My Saved Laptops & PCs Database" section:**
  - Lists all registered devices with specs tags (GPU, CPU, RAM, Storage, Monitor Hz)
  - Active rig highlighted with cyan border + `✓ Active Rig` badge
  - `Set as Active` button on each non-active device → switches the active rig globally
  - `🗑 Delete` button (trash icon) on any device that isn't the only one
  - `+ Add Another Rig` button → expands an inline form to register a new laptop or desktop
- Sign Out button (red)
- Done button (cyan)

---

## Data Models (for context — these are TypeScript types)

**Game:**
- id, title, slug, coverImage, bannerImage, releaseYear, developer
- genres: string[], tags: string[], popularityRank: number
- minimum: { cpuName, cpuScore, gpuName, gpuScore, vramGb, ramGb, storageGb, isSsdRequired }
- recommended: same shape
- similarLighterGames: { id, title, coverImage, genres, vibeReason, minRamGb, minGpuScore, minCpuScore }[]

**LaptopModel:**
- id, brand (Lenovo|ASUS|HP|Acer|Dell|MSI|Apple|Razer), modelName, fullName, series
- priceUsd, cpuName, cpuScore, gpuName, gpuScore, vramGb, ramGb, storage, display, tgpWatts

**UserRigSpecs:**
- isLaptop: boolean
- laptopBrand?, laptopModelId?, cpuName, cpuScore, gpuName, gpuScore
- ramGb, vramGb, storageGb, isSsd
- targetResolution?: '1080p'|'1440p'|'4K'
- coolerId?, coolerName?, caseId?, caseName?, monitorId?, monitorName?, monitorRefreshRate?

**UserProfile:**
- id, email, username, rigName, defaultRig: UserRigSpecs, devices?: UserDevice[], createdAt

**UserDevice:**
- id, userId, name, deviceType: 'laptop'|'desktop', brand?, modelName?, specs: UserRigSpecs, isPrimary, createdAt

---

## Static Data Architecture (Zero Database Quota)

**DO NOT store game/hardware/laptop catalogs in the database.** They are served as static JSON files:
- `public/data/games.json` — 25 games
- `public/data/hardware.json` — CPUs, GPUs, coolers, cases, monitors
- `public/data/laptops.json` — 21 laptops across 7 brands

The Supabase database only contains: `users`, `user_devices`, `rig_checks` tables.

---

## Key UX Rules

1. **Benchmark Target Game in Laptop Shopper**: The search bar is ALWAYS visible inline in the header card. NO popup modals for game search. Results appear as a dropdown `z-50` directly under the search bar. The header panel must have `relative z-10` to prevent the dropdown from going behind elements below it.

2. **Auto-add user laptop in Laptop Shopper**: If the signed-in user has a laptop as their active rig, it automatically pre-loads as the first comparison column tagged `👑 Your Active Laptop`. If the user has a desktop PC or is not signed in, the workspace starts blank.

3. **PC Builder game matrix is sorted descending by FPS by default** — best running games appear at the top.

4. **Device switching is global** — switching active rig in the Auth modal immediately updates Can I Run It specs, Laptop Shopper baseline, and PC Builder.

5. **Never use page reloads** — the app is a Single Page Application. Tab switching is done via state.

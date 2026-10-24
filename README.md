# 🎮 GameGauge

> **PC & Laptop gaming hardware diagnostics, performance benchmarking, and compatibility checking web application.**  
> *Developed as an engineering task during an internship.*

GameGauge is a dark-themed gaming diagnostics and hardware evaluation platform. It enables gamers to test hardware against modern game specifications ("Can I Run It?"), compare laptops side-by-side, assemble custom virtual PC builds to simulate performance, and browse an extensive game requirements library.

---

## 📌 Internship Context
This project was developed as an internship frontend engineering task focused on:
- Architecting a reactive, high-performance **Single Page Application (SPA)** with **React 19**, **TypeScript**, and **Vite**.
- Implementing client-side gaming benchmark algorithms evaluating CPU clock speeds, GPU shader architectures, VRAM, and RAM ceilings.
- Creating an immersive, dark gaming aesthetic using **Tailwind CSS**, glassmorphism, and neon state feedback.
- Supporting a dual storage strategy: zero-configuration **local-first browser storage** with optional cloud persistence via **Supabase**.

---

## ✨ Key Features

- **🎯 "Can I Run It?" Compatibility Checker:**
  - Instantly evaluate your hardware against minimum and recommended game specifications.
  - Granular component-level diagnostics (CPU, GPU, RAM, VRAM, OS architecture).
  - Calculated performance tier scoring (Low, Medium, High, Ultra) and estimated FPS ranges.
- **💻 Side-by-Side Laptop Shopper:**
  - Compare multiple gaming laptop models across processor generations, discrete graphics cards, refresh rates, and thermals.
  - Visual delta highlighting comparing component strengths and price-to-performance metrics.
- **🖥️ Custom Desktop PC Rig Builder:**
  - Assemble custom virtual builds by selecting compatible processors, graphics cards, and memory.
  - Real-time catalog compatibility preview showing which games run best on your custom configuration.
- **📚 Curated Game Catalog & Profiles:**
  - Rich searchable library of modern AAA and indie titles.
  - Complete minimum and recommended specification profiles.
- **⚡ Dual Storage Engine:**
  - Out-of-the-box local storage: save your PC rig and tests locally without signing up.
  - Optional Supabase integration for cloud authentication and cross-device rig synchronization.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript (Vite)
- **Styling:** Tailwind CSS (Dark Cyber Aesthetic, Custom Neon Glow Tokens)
- **Icons:** Lucide React
- **Animations & Effects:** Canvas Confetti (celebration effects on optimal benchmark scores)
- **Database / Backend (Optional):** Supabase (PostgreSQL Auth & Row-Level Storage)
- **Code Quality:** Oxlint & TypeScript strict mode

---

## 📁 Project Structure

```text
gameguage/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (Benchmark cards, Rig builder, Modals)
│   │   ├── services/         # Hardware calculation engine & Supabase client
│   │   ├── types/            # TypeScript interfaces for games, hardware & rigs
│   │   ├── App.tsx           # Main application routing and state container
│   │   └── main.tsx          # React application root
│   ├── public/
│   │   └── data/             # Static game and hardware specification catalogs
│   │       ├── games.json
│   │       ├── hardware.json
│   │       └── laptops.json
│   ├── .env.example          # Environment variables template
│   ├── index.html
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── supabase/
│   └── schema.sql            # Optional Supabase schema for cloud sync
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### 1. Installation
```bash
cd frontend
npm install
```

### 2. Environment Configuration (Optional)
The application works immediately in local mode with no external configuration required. If you want to enable Supabase cloud sync:
```bash
cp .env.example .env
# Open .env and add your Supabase URL and Anon Key
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🏷️ Tags
`#internship` `#webdevelopment` `#react` `#typescript` `#tailwindcss` `#vite` `#gaming` `#hardware` `#pcgaming` `#benchmark` `#frontend`

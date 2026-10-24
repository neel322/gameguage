import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { GAMES } from '../src/data/games.ts';
import { CPUS, GPUS, CPU_COOLERS, PC_CASES, GAMING_MONITORS } from '../src/data/hardware.ts';
import { LAPTOPS, LAPTOP_BRANDS } from '../src/data/laptops.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../public/data');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Export Games
fs.writeFileSync(
  path.join(targetDir, 'games.json'),
  JSON.stringify(GAMES, null, 2),
  'utf-8'
);

// 2. Export Hardware (CPUs, GPUs, Coolers, Cases, Monitors)
fs.writeFileSync(
  path.join(targetDir, 'hardware.json'),
  JSON.stringify({
    cpus: CPUS,
    gpus: GPUS,
    coolers: CPU_COOLERS,
    cases: PC_CASES,
    monitors: GAMING_MONITORS,
  }, null, 2),
  'utf-8'
);

// 3. Export Laptops
fs.writeFileSync(
  path.join(targetDir, 'laptops.json'),
  JSON.stringify({
    brands: LAPTOP_BRANDS,
    laptops: LAPTOPS,
  }, null, 2),
  'utf-8'
);

console.log('Successfully generated public/data/ catalog JSON files:');
console.log(`- games.json: ${GAMES.length} games`);
console.log(`- hardware.json: ${CPUS.length} CPUs, ${GPUS.length} GPUs, ${CPU_COOLERS.length} coolers, ${PC_CASES.length} cases, ${GAMING_MONITORS.length} monitors`);
console.log(`- laptops.json: ${LAPTOPS.length} laptops across ${LAPTOP_BRANDS.length} brands`);

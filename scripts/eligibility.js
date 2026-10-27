// Oblicza liczbe polskich zawodnikow uprawnionych do rejestracji na Polish Championship 2026.
// Metoda: WCA API. Progi = Okres 1 (ostry) z aktualnej strony zawodow.
// Wznawialny dzieki checkpointom w scripts/.cache/.
//
// Uruchomienie:
//   node scripts/eligibility.js pool     -> faza 1: pula aktywnych PL + last_competition
//   node scripts/eligibility.js persons  -> faza 2: PB kazdej osoby (wznawialne)
//   node scripts/eligibility.js csv      -> faza 3: zapis uprawnieni_*.csv
//   node scripts/eligibility.js all      -> wszystkie fazy po kolei

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const BASE = 'https://www.worldcubeassociation.org/api/v0';
const TODAY = '2026-10-27';
const CUTOFF_24M = '2024-10-27'; // 24 miesiace wstecz
const DELAY_MS = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(url, { retries = 6 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= retries) throw new Error(`${res.status} ${url}`);
      const wait = Math.min(30000, 1000 * 2 ** attempt);
      process.stderr.write(`  ${res.status} -> retry za ${wait}ms (${url})\n`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
}

// --- Progi Okresu 1 (ostry). value w jednostkach WCA (centysekundy; FM=ruchy*100). ---
// kind: 'average' | 'single' | 'mbf'
const P1 = {
  '333':   { kind: 'average', max: 630 },    // 6.30 s
  '222':   { kind: 'average', max: 150 },    // 1.50 s
  '444':   { kind: 'average', max: 2700 },   // 27.00 s
  '555':   { kind: 'average', max: 5000 },   // 50.00 s
  '666':   { kind: 'average', max: 9000 },   // 1:30 min
  '777':   { kind: 'average', max: 14500 },  // 2:25 min
  '333bf': { kind: 'single',  max: 2000 },   // 20.00 s
  '333fm': { kind: 'average', max: 2600 },   // 26.00 ruchow (mean*100)
  '333oh': { kind: 'average', max: 1200 },   // 12.00 s
  'clock': { kind: 'average', max: 350 },    // 3.50 s
  'minx':  { kind: 'average', max: 3800 },   // 38.00 s
  'pyram': { kind: 'average', max: 200 },    // 2.00 s
  'skewb': { kind: 'average', max: 250 },    // 2.50 s
  'sq1':   { kind: 'average', max: 900 },    // 9.00 s
  '444bf': { kind: 'single',  max: 30000 },  // 5:00 min
  '555bf': { kind: 'single',  max: 90000 },  // 15:00 min
  '333mbf':{ kind: 'mbf',     minPoints: 21 }, // "over 20 points"
};

// kolejnosc jak na starych plikach
const EVENT_ORDER = ['222','333','444','555','666','777','333bf','333fm','333oh','clock','minx','pyram','skewb','sq1','444bf','555bf','333mbf'];

function mbfPoints(best) {
  // kodowanie single MBF: DD TTTTT MM, DD = 99 - points
  const dd = Math.floor(best / 1e7);
  return 99 - dd;
}

function qualifyingEvents(personalRecords) {
  const out = [];
  for (const ev of EVENT_ORDER) {
    const cfg = P1[ev];
    const pr = personalRecords?.[ev];
    if (!cfg || !pr) continue;
    if (cfg.kind === 'mbf') {
      const b = pr.single?.best;
      if (typeof b === 'number' && b > 0 && mbfPoints(b) >= cfg.minPoints) out.push(ev);
    } else {
      const b = pr[cfg.kind]?.best;
      if (typeof b === 'number' && b > 0 && b <= cfg.max) out.push(ev);
    }
  }
  return out;
}

// --- Faza 1: pula aktywnych PL + last_competition ---
async function phasePool() {
  const comps = [];
  let page = 1;
  process.stderr.write('Pobieram liste polskich zawodow...\n');
  while (true) {
    const url = `${BASE}/competitions?country_iso2=PL&start=${CUTOFF_24M}&end=2026-12-31&page=${page}`;
    const data = await apiGet(url);
    if (data.length === 0) break;
    comps.push(...data);
    if (data.length < 25) break;
    page++;
    await sleep(DELAY_MS);
  }
  // tylko zawody ktore sie juz odbyly (maja wyniki)
  const past = comps.filter((c) => c.end_date <= TODAY);
  process.stderr.write(`Zawodow w oknie: ${comps.length}, odbytych: ${past.length}\n`);

  // pula: wca_id -> { name, last_competition }
  const pool = {};
  for (let i = 0; i < past.length; i++) {
    const c = past[i];
    process.stderr.write(`[${i + 1}/${past.length}] ${c.id}\n`);
    let competitors;
    try {
      competitors = await apiGet(`${BASE}/competitions/${c.id}/competitors`);
    } catch (e) {
      process.stderr.write(`  POMINIETO ${c.id}: ${e.message}\n`);
      await sleep(DELAY_MS);
      continue;
    }
    for (const p of competitors) {
      if (!p.wca_id) continue;
      if ((p.country_iso2 || p.country?.iso2) !== 'PL') continue;
      const prev = pool[p.wca_id];
      if (!prev) {
        pool[p.wca_id] = { name: p.name, last_competition: c.end_date };
      } else if (c.end_date > prev.last_competition) {
        prev.last_competition = c.end_date;
        prev.name = p.name;
      }
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(path.join(CACHE_DIR, 'pool.json'), JSON.stringify(pool, null, 0));
  process.stderr.write(`Pula aktywnych PL (24m): ${Object.keys(pool).length} osob\n`);
}

// --- Faza 2: PB kazdej osoby (wznawialne) ---
async function phasePersons() {
  const pool = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'pool.json'), 'utf8'));
  const cachePath = path.join(CACHE_DIR, 'persons.json');
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
  const ids = Object.keys(pool);
  let done = 0, saved = 0;
  for (const id of ids) {
    done++;
    if (cache[id]) continue;
    try {
      const data = await apiGet(`${BASE}/persons/${id}`);
      const events = qualifyingEvents(data.personal_records);
      cache[id] = { events, events_count: events.length };
    } catch (e) {
      process.stderr.write(`  BLAD ${id}: ${e.message}\n`);
      cache[id] = { events: [], events_count: 0, error: true };
    }
    saved++;
    if (saved % 25 === 0) {
      fs.writeFileSync(cachePath, JSON.stringify(cache));
      process.stderr.write(`[${done}/${ids.length}] zapisano checkpoint (${saved} nowych)\n`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache));
  process.stderr.write(`Faza 2 gotowa. Przetworzono ${Object.keys(cache).length} osob.\n`);
}

// --- Faza 3: zapis CSV ---
function csvEscape(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function phaseCsv() {
  const pool = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'pool.json'), 'utf8'));
  const persons = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'persons.json'), 'utf8'));

  const rows = [];
  for (const [id, info] of Object.entries(pool)) {
    const pr = persons[id];
    if (!pr || pr.events_count === 0) continue; // tylko uprawnieni (>=1 konkurencja)
    rows.push({
      name: info.name,
      wca_id: id,
      events_count: pr.events_count,
      last_competition: info.last_competition,
      events: pr.events.join(' '),
    });
  }

  // sort: wg liczby konkurencji malejaco, potem nazwisko
  rows.sort((a, b) => b.events_count - a.events_count || a.name.localeCompare(b.name, 'pl'));

  const header = 'name,wca_id,events_count,last_competition,events';
  const toCsv = (rs) => '﻿' + [header, ...rs.map((r) =>
    [r.name, r.wca_id, r.events_count, r.last_competition, r.events].map(csvEscape).join(','))].join('\n') + '\n';

  const rows2026 = rows.filter((r) => r.last_competition >= '2026-01-01');

  fs.writeFileSync(path.join(ROOT, 'uprawnieni_24m.csv'), toCsv(rows));
  fs.writeFileSync(path.join(ROOT, 'uprawnieni_2026.csv'), toCsv(rows2026));

  process.stderr.write(`\n=== WYNIK ===\n`);
  process.stderr.write(`Uprawnieni (24m, od ${CUTOFF_24M}): ${rows.length}\n`);
  process.stderr.write(`Uprawnieni (startujacy w 2026):      ${rows2026.length}\n`);
}

const phase = process.argv[2] || 'all';
if (phase === 'pool') await phasePool();
else if (phase === 'persons') await phasePersons();
else if (phase === 'csv') phaseCsv();
else if (phase === 'all') { await phasePool(); await phasePersons(); phaseCsv(); }
else { console.error('Nieznana faza:', phase); process.exit(1); }

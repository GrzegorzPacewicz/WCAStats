#!/usr/bin/env node
import PocketBase from 'pocketbase';

const BASE_URL = 'https://www.worldcubeassociation.org/api/v0';
const PB_URL = process.env.PB_URL || 'https://gp1.pecet.it';
const PB_EMAIL = process.env.PB_EMAIL;
const PB_PASSWORD = process.env.PB_PASSWORD;

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Set PB_EMAIL and PB_PASSWORD environment variables');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

async function fetchCompetitions(countryIso2, year) {
  const competitions = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/competitions?country_iso2=${countryIso2}&start=${year}-01-01&end=${year}-12-31&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const data = await res.json();
    if (data.length === 0) break;
    competitions.push(...data);
    if (data.length < 25) break;
    page++;
  }

  return competitions;
}

async function fetchCompetitors(competitionId) {
  const url = `${BASE_URL}/competitions/${competitionId}/competitors`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function buildStats(countryIso2, year, verbose = false) {
  const competitions = await fetchCompetitions(countryIso2, year);
  if (verbose) console.log(`Found ${competitions.length} competitions`);

  const allCompetitors = new Map();
  const competitionsWithCounts = [];

  for (let i = 0; i < competitions.length; i++) {
    const comp = competitions[i];
    if (verbose) console.log(`[${i + 1}/${competitions.length}] ${comp.name}`);

    try {
      const competitors = await fetchCompetitors(comp.id);
      const compYear = comp.start_date.substring(0, 4);

      const newcomerCount = competitors.filter(p => {
        if (!p.wca_id) return true;
        return p.wca_id.substring(0, 4) === compYear;
      }).length;

      competitionsWithCounts.push({
        ...comp,
        competitorCount: competitors.length,
        newcomerCount
      });

      for (const person of competitors) {
        if (person.wca_id && !allCompetitors.has(person.wca_id)) {
          allCompetitors.set(person.wca_id, person);
        }
      }
    } catch (err) {
      console.warn(`Skipping ${comp.id}: ${err.message}`);
      competitionsWithCounts.push({ ...comp, competitorCount: 0, error: true });
    }
  }

  const uniqueCompetitors = Array.from(allCompetitors.values());
  const males = uniqueCompetitors.filter(p => p.gender === 'm').length;
  const females = uniqueCompetitors.filter(p => p.gender === 'f').length;
  const other = uniqueCompetitors.length - males - females;
  const newcomers = uniqueCompetitors.filter(p => p.wca_id?.substring(0, 4) === String(year)).length;

  const competitionsByMonth = {};
  for (const comp of competitions) {
    const month = new Date(comp.start_date).getMonth();
    competitionsByMonth[month] = (competitionsByMonth[month] || 0) + 1;
  }

  const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
  const chartData = monthNames.map((name, i) => ({ name, count: competitionsByMonth[i] || 0 }));

  return {
    totalCompetitors: uniqueCompetitors.length,
    males,
    females,
    other,
    newcomers,
    competitions: competitionsWithCounts,
    chartData,
    cachedAt: new Date().toISOString()
  };
}

async function saveToCache(countryIso2, year, data) {
  try {
    const existing = await pb.collection('wca_cache').getFirstListItem(
      `country_iso2 = "${countryIso2}" && year = ${year}`
    );
    await pb.collection('wca_cache').update(existing.id, { data });
    console.log(`Updated cache for ${countryIso2} ${year}`);
  } catch {
    await pb.collection('wca_cache').create({ country_iso2: countryIso2, year, data });
    console.log(`Created cache for ${countryIso2} ${year}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node populate-cache.js <country_iso2> <year> [--verbose]');
    console.log('Example: node populate-cache.js PL 2024 --verbose');
    process.exit(1);
  }

  const countryIso2 = args[0].toUpperCase();
  const year = parseInt(args[1], 10);
  const verbose = args.includes('--verbose');

  console.log(`Logging in to PocketBase...`);
  await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD);

  console.log(`Fetching data for ${countryIso2} ${year}...`);
  const data = await buildStats(countryIso2, year, verbose);

  await saveToCache(countryIso2, year, data);
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

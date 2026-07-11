import PocketBase from 'pocketbase';

const BASE_URL = 'https://www.worldcubeassociation.org/api/v0';
const pb = new PocketBase('https://gp1.pecet.it');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCompetitions(countryIso2, year) {
  const competitionsMap = new Map();
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/competitions?country_iso2=${countryIso2}&start=${year}-01-01&end=${year}-12-31&page=${page}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch competitions: ${res.status}`);
    }

    const data = await res.json();
    if (data.length === 0) break;

    for (const comp of data) {
      if (!competitionsMap.has(comp.id)) {
        competitionsMap.set(comp.id, comp);
      }
    }

    if (data.length < 25) break;
    page++;
  }

  return Array.from(competitionsMap.values());
}

async function fetchCompetitors(competitionId) {
  const url = `${BASE_URL}/competitions/${competitionId}/competitors`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch competitors for ${competitionId}: ${res.status}`);
  }

  return res.json();
}

async function saveToPocketBase(countryIso2, year, data) {
  const existing = await pb.collection('wca_cache').getFirstListItem(
    `country_iso2 = "${countryIso2}" && year = ${year}`
  ).catch(() => null);

  if (existing) {
    await pb.collection('wca_cache').update(existing.id, { data });
  } else {
    await pb.collection('wca_cache').create({
      country_iso2: countryIso2,
      year,
      data
    });
  }
}

async function fetchYearData(countryIso2, year) {
  console.log(`\n📅 Pobieranie ${countryIso2} ${year}...`);

  const competitions = await fetchCompetitions(countryIso2, year);
  console.log(`   Znaleziono ${competitions.length} zawodów`);

  if (competitions.length === 0) {
    console.log(`   Brak zawodów, pomijam.`);
    return null;
  }

  const allCompetitors = new Map();
  const competitionsWithCounts = [];

  for (let i = 0; i < competitions.length; i++) {
    const comp = competitions[i];
    process.stdout.write(`\r   Przetwarzanie: ${i + 1}/${competitions.length} - ${comp.name.substring(0, 40)}...`);

    try {
      await sleep(300);
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
      console.warn(`\n   ⚠️  Błąd ${comp.id}: ${err.message}`);
      competitionsWithCounts.push({
        ...comp,
        competitorCount: 0,
        error: true
      });
    }
  }

  console.log('');

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
  const chartData = monthNames.map((name, i) => ({
    name,
    count: competitionsByMonth[i] || 0
  }));

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

async function main() {
  const country = 'PL';
  const startYear = parseInt(process.argv[2]) || 2003;
  const endYear = parseInt(process.argv[3]) || 2022;
  const years = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  console.log(`🚀 Prefetch danych WCA dla ${country}, lata: ${years[0]}-${years[years.length - 1]}`);

  for (const year of years) {
    try {
      const data = await fetchYearData(country, year);
      if (data) {
        await saveToPocketBase(country, year, data);
        console.log(`   ✅ Zapisano do PocketBase`);
      }
    } catch (err) {
      console.error(`   ❌ Błąd dla ${year}: ${err.message}`);
    }
  }

  console.log('\n🎉 Gotowe!');
}

main();

import PocketBase from 'pocketbase';

const BASE_URL = 'https://www.worldcubeassociation.org/api/v0';
const pb = new PocketBase('https://gp1.pecet.it');

export async function fetchCompetitions(countryIso2, year) {
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

export async function fetchCompetitors(competitionId) {
  const url = `${BASE_URL}/competitions/${competitionId}/competitors`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch competitors for ${competitionId}: ${res.status}`);
  }

  return res.json();
}

export async function fetchCompetitionResults(competitionId) {
  const url = `${BASE_URL}/competitions/${competitionId}/results`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch results for ${competitionId}: ${res.status}`);
  }

  return res.json();
}

export async function fetchPerson(wcaId) {
  const url = `${BASE_URL}/persons/${wcaId}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch person ${wcaId}: ${res.status}`);
  }

  return res.json();
}

function getLocalCache(countryIso2, year) {
  const key = `wca-${countryIso2}-${year}`;
  const cached = localStorage.getItem(key);
  return cached ? JSON.parse(cached) : null;
}

function setLocalCache(countryIso2, year, data) {
  const key = `wca-${countryIso2}-${year}`;
  localStorage.setItem(key, JSON.stringify(data));
}

async function setPocketBaseCache(countryIso2, year, data) {
  try {
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
  } catch (err) {
    console.warn('Failed to save to PocketBase:', err.message);
  }
}

export async function getCachedData(countryIso2, year) {
  try {
    const record = await pb.collection('wca_cache').getFirstListItem(
      `country_iso2 = "${countryIso2}" && year = ${year}`
    );
    return record.data;
  } catch {
    return getLocalCache(countryIso2, year);
  }
}


export async function fetchAllData(countryIso2, year, onProgress, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCachedData(countryIso2, year);
    if (cached) return cached;
  }

  const competitions = await fetchCompetitions(countryIso2, year);

  const allCompetitors = new Map();
  const competitionsWithCounts = [];

  for (let i = 0; i < competitions.length; i++) {
    const comp = competitions[i];

    if (onProgress) {
      onProgress({ current: i + 1, total: competitions.length, name: comp.name });
    }

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
      competitionsWithCounts.push({
        ...comp,
        competitorCount: 0,
        error: true
      });
    }
  }

  const uniqueCompetitors = Array.from(allCompetitors.values());

  const males = uniqueCompetitors.filter(p => p.gender === 'm').length;
  const females = uniqueCompetitors.filter(p => p.gender === 'f').length;
  const other = uniqueCompetitors.length - males - females;

  const newcomers = uniqueCompetitors.filter(p => {
    const wcaYear = p.wca_id?.substring(0, 4);
    return wcaYear === String(year);
  }).length;

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

  const result = {
    totalCompetitors: uniqueCompetitors.length,
    males,
    females,
    other,
    newcomers,
    competitions: competitionsWithCounts,
    chartData,
    cachedAt: new Date().toISOString()
  };

  setLocalCache(countryIso2, year, result);
  setPocketBaseCache(countryIso2, year, result);

  return result;
}

const BASE_URL = 'https://www.worldcubeassociation.org/api/v0';

export async function fetchCompetitions(countryIso2, year) {
  const competitions = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/competitions?country_iso2=${countryIso2}&start=${year}-01-01&end=${year}-12-31&page=${page}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch competitions: ${res.status}`);
    }

    const data = await res.json();

    if (data.length === 0) break;

    competitions.push(...data);

    if (data.length < 25) break;
    page++;
  }

  return competitions;
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

function getCacheKey(countryIso2, year) {
  return `wca-${countryIso2}-${year}`;
}

export function getCachedData(countryIso2, year) {
  const key = getCacheKey(countryIso2, year);
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
}

function setCachedData(countryIso2, year, data) {
  const key = getCacheKey(countryIso2, year);
  localStorage.setItem(key, JSON.stringify(data));
}

export async function fetchAllData(countryIso2, year, onProgress, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedData(countryIso2, year);
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

      competitionsWithCounts.push({
        ...comp,
        competitorCount: competitors.length
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

  setCachedData(countryIso2, year, result);

  return result;
}

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

export async function fetchCompetitionsByDateRange(countryIso2, startDate, endDate) {
  const competitionsMap = new Map();
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/competitions?country_iso2=${countryIso2}&start=${startDate}&end=${endDate}&page=${page}`;
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

export async function getLastUpdateTime(countryIso2 = 'PL') {
  try {
    const record = await pb.collection('wca_cache').getFirstListItem(
      `country_iso2 = "${countryIso2}"`,
      { sort: '-updated' }
    );
    return record.updated;
  } catch {
    return null;
  }
}


export async function fetchAllYearsData(countryIso2) {
  const records = await pb.collection('wca_cache').getFullList({
    filter: `country_iso2 = "${countryIso2}"`,
    sort: 'year',
    requestKey: null,
  });

  if (records.length === 0) {
    throw new Error('Brak danych w cache. Najpierw pobierz dane dla poszczególnych lat.');
  }

  let totalCompetitions = 0;
  let totalNewcomers = 0;
  let totalParticipations = 0;
  let totalMales = 0;
  let totalFemales = 0;
  const yearlyTrend = [];
  const monthCounts = Array(12).fill(0);
  const allCompetitions = [];
  const cityCounts = {};
  const eventCounts = {};
  const eventsByYear = {};

  for (const record of records) {
    const data = record.data;
    const year = record.year;

    totalCompetitions += data.competitions.length;
    totalNewcomers += data.newcomers;
    totalMales += data.males || 0;
    totalFemales += data.females || 0;

    for (const comp of data.competitions) {
      totalParticipations += comp.competitorCount || 0;
      allCompetitions.push({ ...comp, year });

      const month = new Date(comp.start_date).getMonth();
      monthCounts[month]++;

      if (comp.city) {
        cityCounts[comp.city] = (cityCounts[comp.city] || 0) + 1;
      }

      if (comp.event_ids) {
        for (const eventId of comp.event_ids) {
          eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
          if (!eventsByYear[year]) eventsByYear[year] = {};
          eventsByYear[year][eventId] = (eventsByYear[year][eventId] || 0) + 1;
        }
      }
    }

    yearlyTrend.push({
      year,
      competitions: data.competitions.length,
      newcomers: data.newcomers,
      competitors: data.totalCompetitors,
      males: data.males || 0,
      females: data.females || 0,
    });
  }

  const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
  const seasonality = monthNames.map((name, i) => ({
    name,
    count: monthCounts[i],
  }));

  const biggestCompetitions = [...allCompetitions]
    .filter(c => c.competitorCount > 0)
    .sort((a, b) => b.competitorCount - a.competitorCount)
    .slice(0, 10);

  const topCities = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const topEvents = Object.entries(eventCounts)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);

  const eventTrends = Object.entries(eventsByYear)
    .map(([year, events]) => ({ year: parseInt(year), ...events }))
    .sort((a, b) => a.year - b.year);

  const mostCompetitionsYear = yearlyTrend.reduce((max, y) => y.competitions > max.count ? { year: y.year, count: y.competitions } : max, { year: 0, count: 0 });
  const mostNewcomersYear = yearlyTrend.reduce((max, y) => y.newcomers > max.count ? { year: y.year, count: y.newcomers } : max, { year: 0, count: 0 });

  const sortedByDate = [...allCompetitions].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const firstCompetition = sortedByDate[0] || { name: '-', year: '-' };

  return {
    totalCompetitions,
    totalUniqueCompetitors: totalNewcomers,
    totalNewcomers,
    totalMales,
    totalFemales,
    yearsActive: records.length,
    yearlyTrend,
    seasonality,
    biggestCompetitions,
    topCities,
    topEvents,
    eventTrends,
    records: {
      mostCompetitionsYear,
      mostNewcomersYear,
      firstCompetition: { name: firstCompetition.name, year: firstCompetition.year },
    },
    averages: {
      competitionsPerYear: totalCompetitions / records.length,
      competitorsPerCompetition: totalParticipations / totalCompetitions,
      newcomersPerYear: totalNewcomers / records.length,
    },
  };
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

export async function refreshRecentCompetitions(countryIso2, onProgress) {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const startDate = fourWeeksAgo.toISOString().split('T')[0];
  const endDate = oneYearFromNow.toISOString().split('T')[0];

  const competitions = await fetchCompetitionsByDateRange(countryIso2, startDate, endDate);

  if (competitions.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  const competitionsByYear = {};
  for (const comp of competitions) {
    const year = parseInt(comp.start_date.substring(0, 4));
    if (!competitionsByYear[year]) {
      competitionsByYear[year] = [];
    }
    competitionsByYear[year].push(comp);
  }

  let fetchedCount = 0;
  let skippedCount = 0;
  let totalProcessed = 0;

  for (const [year, comps] of Object.entries(competitionsByYear)) {
    const yearNum = parseInt(year);

    let existingData = await getCachedData(countryIso2, yearNum);
    if (!existingData) {
      existingData = {
        totalCompetitors: 0,
        males: 0,
        females: 0,
        other: 0,
        newcomers: 0,
        competitions: [],
        chartData: [],
        cachedAt: null
      };
    }

    const existingCompsMap = new Map(
      existingData.competitions.map(c => [c.id, c])
    );

    let yearModified = false;

    for (let i = 0; i < comps.length; i++) {
      const comp = comps[i];
      totalProcessed++;

      const compEndDate = new Date(comp.end_date);
      const isOldAndCached = compEndDate < twoWeeksAgo && existingCompsMap.has(comp.id) && existingCompsMap.get(comp.id).competitorCount > 0;

      if (onProgress) {
        onProgress({
          current: totalProcessed,
          total: competitions.length,
          name: isOldAndCached ? `${comp.name} (cache)` : comp.name
        });
      }

      if (isOldAndCached) {
        skippedCount++;
        continue;
      }

      try {
        const competitors = await fetchCompetitors(comp.id);
        const compYear = comp.start_date.substring(0, 4);

        const newcomerCount = competitors.filter(p => {
          if (!p.wca_id) return true;
          return p.wca_id.substring(0, 4) === compYear;
        }).length;

        existingCompsMap.set(comp.id, {
          ...comp,
          competitorCount: competitors.length,
          newcomerCount
        });
        fetchedCount++;
        yearModified = true;
      } catch (err) {
        console.warn(`Skipping ${comp.id}: ${err.message}`);
        if (!existingCompsMap.has(comp.id)) {
          existingCompsMap.set(comp.id, {
            ...comp,
            competitorCount: 0,
            newcomerCount: 0,
            error: true
          });
          yearModified = true;
        }
      }
    }

    if (!yearModified) {
      continue;
    }

    const updatedCompetitions = Array.from(existingCompsMap.values())
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const allCompetitors = new Map();
    for (const comp of updatedCompetitions) {
      if (comp.error) continue;
      try {
        const competitors = await fetchCompetitors(comp.id);
        for (const person of competitors) {
          if (person.wca_id && !allCompetitors.has(person.wca_id)) {
            allCompetitors.set(person.wca_id, person);
          }
        }
      } catch (err) {
        console.warn(`Skipping competitors for ${comp.id}: ${err.message}`);
      }
    }

    const uniqueCompetitors = Array.from(allCompetitors.values());
    const males = uniqueCompetitors.filter(p => p.gender === 'm').length;
    const females = uniqueCompetitors.filter(p => p.gender === 'f').length;
    const other = uniqueCompetitors.length - males - females;
    const newcomers = uniqueCompetitors.filter(p => {
      const wcaYear = p.wca_id?.substring(0, 4);
      return wcaYear === String(yearNum);
    }).length;

    const competitionsByMonth = {};
    for (const comp of updatedCompetitions) {
      const month = new Date(comp.start_date).getMonth();
      competitionsByMonth[month] = (competitionsByMonth[month] || 0) + 1;
    }

    const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    const chartData = monthNames.map((name, idx) => ({
      name,
      count: competitionsByMonth[idx] || 0
    }));

    const result = {
      totalCompetitors: uniqueCompetitors.length,
      males,
      females,
      other,
      newcomers,
      competitions: updatedCompetitions,
      chartData,
      cachedAt: new Date().toISOString()
    };

    await setPocketBaseCache(countryIso2, yearNum, result);
    setLocalCache(countryIso2, yearNum, result);
  }

  return { updated: fetchedCount, skipped: skippedCount };
}

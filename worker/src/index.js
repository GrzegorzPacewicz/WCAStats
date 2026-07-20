const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SUBREQUEST_BUDGET = 40;
const CACHE_STALE_DAYS = 14;

async function sendDiscordNotification(env, message, isError = false) {
  if (!env.DISCORD_WEBHOOK_URL) return;

  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: isError ? '❌ WCA Stats Prefetch Error' : '✅ WCA Stats Prefetch OK',
          description: message,
          color: isError ? 0xff0000 : 0x00ff00,
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('Discord notification failed:', err.message);
  }
}

async function fetchCompetitions(env, year) {
  const competitionsMap = new Map();
  let page = 1;

  while (true) {
    const url = `${env.WCA_API_URL}/competitions?country_iso2=${env.COUNTRY}&start=${year}-01-01&end=${year}-12-31&page=${page}`;
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

async function fetchCompetitors(env, competitionId) {
  const url = `${env.WCA_API_URL}/competitions/${competitionId}/competitors`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch competitors for ${competitionId}: ${res.status}`);
  }

  return res.json();
}

async function logToPocketBase(env, status, message) {
  try {
    await fetch(`${env.POCKETBASE_URL}/api/collections/prefetch_logs/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, message })
    });
  } catch (err) {
    console.error('Failed to log:', err.message);
  }
}

async function getCompetitionCache(env, competitionIds) {
  if (competitionIds.length === 0) return new Map();

  const filter = competitionIds.map(id => `competition_id='${id}'`).join(' || ');
  const url = `${env.POCKETBASE_URL}/api/collections/competition_cache/records?filter=(${filter})&perPage=500`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const cache = new Map();
    for (const item of data.items || []) {
      cache.set(item.competition_id, item);
    }
    return cache;
  } catch (err) {
    console.error('Failed to get competition cache:', err.message);
    return new Map();
  }
}

async function saveCompetitionCache(env, competition, competitorCount, newcomerCount, isFinal) {
  const payload = {
    competition_id: competition.id,
    year: parseInt(competition.start_date.substring(0, 4)),
    end_date: competition.end_date,
    competitor_count: competitorCount,
    newcomer_count: newcomerCount,
    is_final: isFinal,
    cached_at: new Date().toISOString()
  };

  const headers = { 'Content-Type': 'application/json' };
  const checkUrl = `${env.POCKETBASE_URL}/api/collections/competition_cache/records?filter=(competition_id='${competition.id}')`;

  try {
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();

    if (checkData.items && checkData.items.length > 0) {
      await fetch(`${env.POCKETBASE_URL}/api/collections/competition_cache/records/${checkData.items[0].id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${env.POCKETBASE_URL}/api/collections/competition_cache/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    }
  } catch (err) {
    console.error('Failed to save competition cache:', err.message);
  }
}

async function saveToPocketBase(env, year, data) {
  const listUrl = `${env.POCKETBASE_URL}/api/collections/wca_cache/records?filter=(country_iso2='${env.COUNTRY}' && year=${year})`;
  const listRes = await fetch(listUrl);
  const listData = await listRes.json();

  const payload = {
    country_iso2: env.COUNTRY,
    year,
    data: JSON.stringify(data)
  };

  const headers = { 'Content-Type': 'application/json' };

  if (listData.items && listData.items.length > 0) {
    const existing = listData.items[0];
    await fetch(`${env.POCKETBASE_URL}/api/collections/wca_cache/records/${existing.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`${env.POCKETBASE_URL}/api/collections/wca_cache/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  }
}

function isCompetitionFinal(endDate) {
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = (now - end) / (1000 * 60 * 60 * 24);
  return diffDays > CACHE_STALE_DAYS;
}

async function fetchYearData(env, year, subrequestBudget) {
  const competitions = await fetchCompetitions(env, year);
  subrequestBudget.used += Math.ceil(competitions.length / 25);

  if (competitions.length === 0) {
    return null;
  }

  const competitionIds = competitions.map(c => c.id);
  const competitionCache = await getCompetitionCache(env, competitionIds);
  subrequestBudget.used += 1;

  const competitionsWithCounts = [];
  let skippedCount = 0;
  let fetchedCount = 0;

  for (const comp of competitions) {
    const cached = competitionCache.get(comp.id);
    const isFinal = isCompetitionFinal(comp.end_date);

    if (cached && cached.is_final && isFinal) {
      competitionsWithCounts.push({
        ...comp,
        competitorCount: cached.competitor_count,
        newcomerCount: cached.newcomer_count,
        fromCache: true
      });
      skippedCount++;
      continue;
    }

    if (subrequestBudget.used >= SUBREQUEST_BUDGET) {
      competitionsWithCounts.push({
        ...comp,
        competitorCount: cached?.competitor_count || 0,
        newcomerCount: cached?.newcomer_count || 0,
        deferred: true
      });
      continue;
    }

    try {
      await sleep(300);
      const competitors = await fetchCompetitors(env, comp.id);
      subrequestBudget.used += 1;
      fetchedCount++;

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

      if (isFinal) {
        await saveCompetitionCache(env, comp, competitors.length, newcomerCount, true);
        subrequestBudget.used += 2;
      }
    } catch (err) {
      competitionsWithCounts.push({
        ...comp,
        competitorCount: cached?.competitor_count || 0,
        newcomerCount: cached?.newcomer_count || 0,
        error: true
      });
    }
  }

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

  const totalCompetitors = competitionsWithCounts.reduce((sum, c) => sum + c.competitorCount, 0);
  const newcomers = competitionsWithCounts.reduce((sum, c) => sum + (c.newcomerCount || 0), 0);
  const deferredComps = competitionsWithCounts.filter(c => c.deferred).length;

  return {
    totalCompetitors,
    males: 0,
    females: 0,
    other: 0,
    newcomers,
    competitions: competitionsWithCounts,
    chartData,
    cachedAt: new Date().toISOString(),
    _meta: {
      fromCache: skippedCount,
      fetched: fetchedCount,
      deferred: deferredComps,
      subrequestsUsed: subrequestBudget.used
    }
  };
}

export default {
  async scheduled(event, env, ctx) {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear];
    const results = [];
    const errors = [];
    const subrequestBudget = { used: 0 };

    for (const year of years) {
      try {
        const data = await fetchYearData(env, year, subrequestBudget);
        if (data) {
          await saveToPocketBase(env, year, data);
          subrequestBudget.used += 2;

          const meta = data._meta;
          let detail = `${year}: ${data.competitions.length} zawodów`;
          if (meta) {
            detail += ` (cache: ${meta.fromCache}, fetch: ${meta.fetched}`;
            if (meta.deferred > 0) detail += `, odłożone: ${meta.deferred}`;
            detail += `)`;
          }
          results.push(detail);
        } else {
          results.push(`${year}: brak danych`);
        }
      } catch (err) {
        errors.push(`${year}: ${err.message}`);
      }
    }

    results.push(`Subrequests: ${subrequestBudget.used}/${SUBREQUEST_BUDGET}`);

    const status = errors.length > 0 ? 'error' : 'ok';
    const message = [
      ...results,
      ...(errors.length > 0 ? ['Błędy:', ...errors] : [])
    ].join('\n');

    await logToPocketBase(env, status, message);
    await sendDiscordNotification(env, message, errors.length > 0);
    console.log(`Prefetch completed: ${status}`, message);
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/run') {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized - no token', { status: 401, headers: corsHeaders });
      }

      const token = authHeader.substring(7);
      try {
        const verifyRes = await fetch(`${env.POCKETBASE_URL}/api/collections/users/auth-refresh`, {
          method: 'POST',
          headers: { 'Authorization': token }
        });
        if (!verifyRes.ok) {
          const text = await verifyRes.text();
          return new Response(`Invalid token: ${verifyRes.status} ${text}`, { status: 401, headers: corsHeaders });
        }
      } catch (err) {
        return new Response(`Auth error: ${err.message}`, { status: 401, headers: corsHeaders });
      }

      ctx.waitUntil(this.scheduled({}, env, ctx));
      return new Response('Prefetch started', { status: 200, headers: corsHeaders });
    }

    if (url.pathname === '/test-discord') {
      const hasWebhook = !!env.DISCORD_WEBHOOK_URL;
      if (!hasWebhook) {
        return new Response('DISCORD_WEBHOOK_URL not set', { status: 500 });
      }

      try {
        const res = await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '✅ WCA Stats Test',
              description: 'Test notification',
              color: 0x00ff00,
              timestamp: new Date().toISOString()
            }]
          })
        });
        const text = await res.text();
        return new Response(`Discord response: ${res.status} - ${text}`, { status: 200 });
      } catch (err) {
        return new Response(`Discord error: ${err.message}`, { status: 500 });
      }
    }

    return new Response('WCA Stats Prefetch Worker. GET /run to trigger manually.', { status: 200 });
  }
};

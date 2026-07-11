const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendEmail(env, subject, body) {
  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: env.NOTIFY_EMAIL }] }],
      from: { email: `wcastats@${env.FROM_DOMAIN}`, name: 'WCA Stats' },
      subject,
      content: [{ type: 'text/plain', value: body }]
    })
  });
  if (!res.ok) {
    console.error('Email failed:', await res.text());
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

async function getPocketBaseToken(env) {
  const res = await fetch(`${env.POCKETBASE_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: env.PB_ADMIN_EMAIL,
      password: env.PB_ADMIN_PASSWORD
    })
  });

  if (!res.ok) {
    throw new Error(`PocketBase auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.token;
}

async function logToPocketBase(env, token, status, message) {
  try {
    await fetch(`${env.POCKETBASE_URL}/api/collections/prefetch_logs/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ status, message })
    });
  } catch (err) {
    console.error('Failed to log:', err.message);
  }
}

async function saveToPocketBase(env, year, data, token) {
  const listUrl = `${env.POCKETBASE_URL}/api/collections/wca_cache/records?filter=(country_iso2='${env.COUNTRY}' && year=${year})`;
  const listRes = await fetch(listUrl, {
    headers: { 'Authorization': token }
  });
  const listData = await listRes.json();

  const payload = {
    country_iso2: env.COUNTRY,
    year,
    data: JSON.stringify(data)
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token
  };

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

async function fetchYearData(env, year) {
  const competitions = await fetchCompetitions(env, year);

  if (competitions.length === 0) {
    return null;
  }

  const allCompetitors = new Map();
  const competitionsWithCounts = [];

  for (const comp of competitions) {
    try {
      await sleep(300);
      const competitors = await fetchCompetitors(env, comp.id);
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

export default {
  async scheduled(event, env, ctx) {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear];
    const results = [];
    const errors = [];

    let token;
    try {
      token = await getPocketBaseToken(env);
    } catch (err) {
      await sendEmail(env, 'WCA Stats prefetch BŁĄD', `Nie można zalogować do PocketBase: ${err.message}`);
      return;
    }

    for (const year of years) {
      try {
        const data = await fetchYearData(env, year);
        if (data) {
          await saveToPocketBase(env, year, data, token);
          results.push(`${year}: ${data.competitions.length} zawodów, ${data.totalCompetitors} zawodników`);
        } else {
          results.push(`${year}: brak danych`);
        }
      } catch (err) {
        errors.push(`${year}: ${err.message}`);
      }
    }

    const status = errors.length > 0 ? 'error' : 'ok';
    const message = [
      ...results,
      ...(errors.length > 0 ? ['Błędy:', ...errors] : [])
    ].join('\n');

    await logToPocketBase(env, token, status, message);
    await sendEmail(env, `WCA Stats prefetch ${status === 'ok' ? 'OK' : 'z błędami'}`, message);
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/run') {
      ctx.waitUntil(this.scheduled({}, env, ctx));
      return new Response('Prefetch started', { status: 200 });
    }

    return new Response('WCA Stats Prefetch Worker. GET /run to trigger manually.', { status: 200 });
  }
};

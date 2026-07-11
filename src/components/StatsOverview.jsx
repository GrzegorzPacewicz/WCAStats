import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts';
import { fetchAllYearsData } from '../api/wca';

const EVENT_NAMES = {
  '333': '3x3x3',
  '222': '2x2x2',
  '444': '4x4x4',
  '555': '5x5x5',
  '666': '6x6x6',
  '777': '7x7x7',
  '333bf': '3bld',
  '333fm': 'FMC',
  '333oh': 'OH',
  '333ft': 'Feet*',
  '333mbf': 'MBLD',
  '333mbo': 'MBLD Old*',
  '444bf': '4bld',
  '555bf': '5bld',
  'clock': 'Clock',
  'minx': 'Megaminx',
  'pyram': 'Pyraminx',
  'skewb': 'Skewb',
  'sq1': 'Square-1',
  'magic': 'Magic*',
  'mmagic': 'MasterM*',
};

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const competitions = payload.find(p => p.dataKey === 'competitions')?.value || 0;
  const competitors = payload.find(p => p.dataKey === 'competitors')?.value || 0;
  const newcomers = payload.find(p => p.dataKey === 'newcomers')?.value || 0;
  const newcomerPercent = competitors > 0 ? ((newcomers / competitors) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="font-medium text-gray-900 mb-2">{label}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-blue-600">Zawody:</span>
          <span>{competitions}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-amber-600">Aktywni:</span>
          <span>{competitors.toLocaleString('pl-PL')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-green-600">Debiutanci:</span>
          <span>{newcomers.toLocaleString('pl-PL')} ({newcomerPercent}%)</span>
        </div>
      </div>
    </div>
  );
}

function GenderTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const males = payload.find(p => p.dataKey === 'males')?.value || 0;
  const females = payload.find(p => p.dataKey === 'females')?.value || 0;
  const total = males + females;
  const malePercent = total > 0 ? ((males / total) * 100).toFixed(1) : 0;
  const femalePercent = total > 0 ? ((females / total) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="font-medium text-gray-900 mb-2">{label}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-blue-600">Mężczyźni:</span>
          <span>{males} ({malePercent}%)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-pink-600">Kobiety:</span>
          <span>{females} ({femalePercent}%)</span>
        </div>
      </div>
    </div>
  );
}

export default function StatsOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchAllYearsData('PL');
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <div className="text-gray-500">Ładowanie statystyk...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="text-red-800 font-medium">Wystąpił błąd</div>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.totalCompetitions}</div>
          <div className="text-sm text-gray-500">Zawodów łącznie</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.totalUniqueCompetitors.toLocaleString('pl-PL')}</div>
          <div className="text-sm text-gray-500">Unikalnych zawodników</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.totalNewcomers.toLocaleString('pl-PL')}</div>
          <div className="text-sm text-gray-500">Debiutantów łącznie</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.yearsActive}</div>
          <div className="text-sm text-gray-500">Lat aktywności</div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Rozwój społeczności przez lata</h2>
        <div className="h-72 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.yearlyTrend} margin={{ left: -35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 2000]} />
              <Tooltip content={<TrendTooltip />} cursor={false} />
              <Bar yAxisId="left" dataKey="competitions" fill="#93c5fd" name="Zawody" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="competitors" stroke="#f59e0b" strokeWidth={2} name="Aktywni" dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="newcomers" stroke="#10b981" strokeWidth={2} name="Debiutanci" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-300"></span>
            Zawody
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            Aktywni zawodnicy
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Debiutanci
          </span>
        </div>
      </div>

      {/* Gender chart */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Podział płci przez lata</h2>
        <p className="text-xs text-gray-500 mb-2">Kliknij na rok aby zobaczyć szczegóły</p>
        <div className="h-64 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.yearlyTrend} margin={{ left: -35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip content={<GenderTooltip />} cursor={false} />
              <Bar dataKey="males" stackId="a" fill="#3b82f6" name="Mężczyźni" style={{ cursor: 'pointer' }} onClick={(data) => setSelectedYear(data)} />
              <Bar dataKey="females" stackId="a" fill="#ec4899" name="Kobiety" radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }} onClick={(data) => setSelectedYear(data)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Mężczyźni: {stats.totalMales.toLocaleString('pl-PL')} ({((stats.totalMales / (stats.totalMales + stats.totalFemales)) * 100).toFixed(1)}%)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-500"></span>
            Kobiety: {stats.totalFemales.toLocaleString('pl-PL')} ({((stats.totalFemales / (stats.totalMales + stats.totalFemales)) * 100).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Year details popup */}
      {selectedYear && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-start mb-3">
            <h2 className="font-semibold text-gray-900">Szczegóły: {selectedYear.year}</h2>
            <button
              onClick={() => setSelectedYear(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Zawody</div>
              <div className="font-medium text-lg">{selectedYear.competitions}</div>
            </div>
            <div>
              <div className="text-gray-500">Aktywni zawodnicy</div>
              <div className="font-medium text-lg">{selectedYear.competitors?.toLocaleString('pl-PL')}</div>
            </div>
            <div>
              <div className="text-gray-500">Debiutanci</div>
              <div className="font-medium text-lg">
                {selectedYear.newcomers?.toLocaleString('pl-PL')} ({((selectedYear.newcomers / selectedYear.competitors) * 100).toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="text-gray-500">Kobiety</div>
              <div className="font-medium text-lg">
                {selectedYear.females} ({((selectedYear.females / (selectedYear.males + selectedYear.females)) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seasonality */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Sezonowość (wszystkie lata)</h2>
        <div className="h-64 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.seasonality} margin={{ left: -35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} domain={[0, 'auto']} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: 'none',
                }}
                itemStyle={{ color: '#8b5cf6' }}
                labelStyle={{ color: '#111827', fontWeight: 500 }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Zawody" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top events */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Popularność konkurencji</h2>
        <div className="h-[500px] [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topEvents.map(e => ({
                ...e,
                name: EVENT_NAMES[e.event] || e.event,
                fill: ['333ft', '333mbo', 'magic', 'mmagic'].includes(e.event) ? '#a16207' : '#3b82f6'
              }))} layout="vertical" margin={{ left: -40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} width={150} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: 'none',
                }}
                itemStyle={{ color: '#f59e0b' }}
                labelStyle={{ color: '#111827', fontWeight: 500 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Zawody">
                {stats.topEvents.map((entry, index) => {
                  const isHistoric = ['333ft', '333mbo', 'magic', 'mmagic'].includes(entry.event);
                  return <Cell key={`cell-${index}`} fill={isHistoric ? '#d97706' : '#3b82f6'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2">* konkurencje historyczne</p>
      </div>

      {/* Top cities */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Miasta z największą liczbą zawodów</h2>
        <div className="h-96 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topCities.map(c => ({
                ...c,
                city: c.city === 'Dąbrowa Górnicza' ? 'D. Górnicza' : c.city
              }))} layout="vertical" margin={{ left: -40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis dataKey="city" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} width={130} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: 'none',
                }}
                itemStyle={{ color: '#059669' }}
                labelStyle={{ color: '#111827', fontWeight: 500 }}
              />
              <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} name="Zawody" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Biggest competitions */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Największe zawody w historii</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {stats.biggestCompetitions.map((comp, i) => (
            <div key={comp.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <span className="text-gray-400 mr-3">#{i + 1}</span>
                <span className="font-medium text-gray-900">{comp.name}</span>
                <span className="text-sm text-gray-500 ml-2">({comp.year})</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {comp.competitorCount} uczestników
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Record years */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Rekordowe lata</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Najwięcej zawodów:</span>
              <span className="font-medium">{stats.records.mostCompetitionsYear.year} ({stats.records.mostCompetitionsYear.count})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Najwięcej debiutantów:</span>
              <span className="font-medium">{stats.records.mostNewcomersYear.year} ({stats.records.mostNewcomersYear.count})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pierwsze zawody:</span>
              <span className="font-medium">{stats.records.firstCompetition.name} ({stats.records.firstCompetition.year})</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Średnie</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Zawodów rocznie:</span>
              <span className="font-medium">{stats.averages.competitionsPerYear.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Uczestników na zawodach:</span>
              <span className="font-medium">{stats.averages.competitorsPerCompetition.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Debiutantów rocznie:</span>
              <span className="font-medium">{stats.averages.newcomersPerYear.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

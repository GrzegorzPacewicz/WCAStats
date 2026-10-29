import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts';
import { fetchAllYearsData } from '../api/wca';
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from './chartStyles';

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

const EVENT_COLORS = {
  '333': '#3b82f6',
  '222': '#f59e0b',
  '444': '#10b981',
  'pyram': '#ec4899',
  '333oh': '#8b5cf6',
  'skewb': '#06b6d4',
  'minx': '#f97316',
  'clock': '#6366f1',
  'sq1': '#84cc16',
  '555': '#14b8a6',
  '666': '#a855f7',
  '777': '#78716c',
  '333bf': '#0ea5e9',
  '333fm': '#eab308',
  '333mbf': '#dc2626',
  '444bf': '#7c3aed',
  '555bf': '#be185d',
};

const DEFAULT_VISIBLE_EVENTS = ['333', '222', '444', 'pyram', '333oh'];

const HISTORIC_EVENTS = ['333ft', '333mbo', 'magic', 'mmagic'];

function LifecycleTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const [first, last] = p.range;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="font-medium text-gray-900">{p.name}</div>
      <div className="text-sm text-gray-600">
        {first === last ? first : `${first}–${last}`}
        {' '}({last - first + 1} {last - first === 0 ? 'rok' : 'lat'})
      </div>
    </div>
  );
}

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
  const [visibleEvents, setVisibleEvents] = useState(DEFAULT_VISIBLE_EVENTS);

  const toggleEvent = (eventId) => {
    setVisibleEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

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

  const minYear = stats.yearlyTrend[0]?.year;
  const maxYear = stats.yearlyTrend[stats.yearlyTrend.length - 1]?.year;

  // Drop event ids we can't name (stray/invalid ids in the source data, e.g. "ft")
  const knownTopEvents = stats.topEvents.filter(e => EVENT_NAMES[e.event]);
  const lifecycleData = stats.eventLifecycle
    .filter(e => EVENT_NAMES[e.event])
    .map(e => ({ name: EVENT_NAMES[e.event], range: [e.first, e.last], event: e.event }));

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
            <ComposedChart data={stats.yearlyTrend} margin={{ left: 0, right: 0 }}>
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
            <BarChart data={stats.yearlyTrend} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} width={40} />
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
            <BarChart data={stats.seasonality} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} domain={[0, 'auto']} />
              <Tooltip
                cursor={false}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                itemStyle={{ color: '#8b5cf6' }}
                labelStyle={TOOLTIP_LABEL_STYLE}
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
            <BarChart data={knownTopEvents.map(e => ({
                ...e,
                name: EVENT_NAMES[e.event],
                fill: HISTORIC_EVENTS.includes(e.event) ? '#a16207' : '#3b82f6'
              }))} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} width={80} />
              <Tooltip
                cursor={false}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                itemStyle={{ color: '#f59e0b' }}
                labelStyle={TOOLTIP_LABEL_STYLE}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Zawody">
                {knownTopEvents.map((entry, index) => {
                  const isHistoric = HISTORIC_EVENTS.includes(entry.event);
                  return <Cell key={`cell-${index}`} fill={isHistoric ? '#d97706' : '#3b82f6'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2">* konkurencje historyczne</p>
      </div>

      {/* Event trends over years */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Trendy popularności konkurencji</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(EVENT_COLORS).map(([eventId, color]) => {
            const isActive = visibleEvents.includes(eventId);
            return (
              <button
                key={eventId}
                onClick={() => toggleEvent(eventId)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                style={isActive ? { backgroundColor: color } : {}}
              >
                {EVENT_NAMES[eventId]}
              </button>
            );
          })}
        </div>
        <div className="h-80 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.eventTrends} margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#6b7280', fontSize: 9 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} width={40} />
              <Tooltip
                cursor={false}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
              />
              {visibleEvents.map(eventId => (
                <Line
                  key={eventId}
                  type="monotone"
                  dataKey={eventId}
                  name={EVENT_NAMES[eventId]}
                  stroke={EVENT_COLORS[eventId]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event lifecycle */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Cykl życia konkurencji</h2>
        <p className="text-xs text-gray-500 mb-4">Pierwszy i ostatni rok, w którym dana konkurencja była rozgrywana</p>
        <div className="h-[520px] [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={lifecycleData}
              layout="vertical"
              margin={{ left: 0, right: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                domain={[minYear, maxYear]}
                allowDecimals={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis dataKey="name" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} width={80} />
              <Tooltip content={<LifecycleTooltip />} cursor={false} />
              <Bar dataKey="range" radius={[4, 4, 4, 4]} minPointSize={3}>
                {lifecycleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={HISTORIC_EVENTS.includes(entry.event) ? '#d97706' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2"><span className="inline-block w-2 h-2 rounded-full bg-amber-600 align-middle mr-1"></span> konkurencje historyczne (już nierozgrywane)</p>
      </div>

      {/* Newcomers vs returning */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Debiutanci vs powracający zawodnicy</h2>
        <div className="h-72 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.yearlyTrend} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} width={40} />
              <Tooltip cursor={false} contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              <Bar dataKey="returning" stackId="a" fill="#6366f1" name="Powracający" />
              <Bar dataKey="newcomers" stackId="a" fill="#10b981" name="Debiutanci" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
            Powracający
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Debiutanci
          </span>
        </div>
      </div>

      {/* Average competition size and events */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Średnia wielkość zawodów i liczba konkurencji</h2>
        <div className="h-72 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.yearlyTrend} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip cursor={false} contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              <Line yAxisId="left" type="monotone" dataKey="avgSize" stroke="#3b82f6" strokeWidth={2} name="Śr. uczestników" dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="avgEvents" stroke="#f59e0b" strokeWidth={2} name="Śr. konkurencji" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Śr. uczestników na zawodach
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            Śr. liczba konkurencji
          </span>
        </div>
      </div>

      {/* Competition size distribution */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Rozkład wielkości zawodów</h2>
        <p className="text-xs text-gray-500 mb-4">Liczba zawodów wg liczby uczestników</p>
        <div className="h-64 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.sizeDistribution} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} domain={[0, 'auto']} />
              <Tooltip cursor={false} contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={{ color: '#8b5cf6' }} labelStyle={TOOLTIP_LABEL_STYLE} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Zawody" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Geographic growth */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Rozrost geograficzny</h2>
        <p className="text-xs text-gray-500 mb-4">Miasta z zawodami łącznie (narastająco) oraz nowe miasta w danym roku</p>
        <div className="h-72 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.cityGrowth} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
              <Tooltip cursor={false} contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              <Area type="monotone" dataKey="totalCities" stroke="#059669" fill="#a7f3d0" strokeWidth={2} name="Miasta łącznie" />
              <Bar dataKey="newCities" fill="#047857" radius={[4, 4, 0, 0]} name="Nowe miasta" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-200 border border-emerald-500"></span>
            Miasta łącznie (narastająco)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-700"></span>
            Nowe miasta w roku
          </span>
        </div>
      </div>

      {/* Top cities */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Miasta z największą liczbą zawodów</h2>
        <div className="h-96 [&_svg]:outline-none [&_*]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topCities.map(c => ({
                ...c,
                city: c.city === 'Dąbrowa Górnicza' ? 'D. Górnicza' : c.city
              }))} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis dataKey="city" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} width={85} />
              <Tooltip
                cursor={false}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                itemStyle={{ color: '#059669' }}
                labelStyle={TOOLTIP_LABEL_STYLE}
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

import { useState, useEffect } from 'react';
import CountryPicker from './components/CountryPicker';
import YearPicker from './components/YearPicker';
import StatsSummary from './components/StatsSummary';
import CompetitionList from './components/CompetitionList';
import Chart from './components/Chart';
import PersonModal from './components/PersonModal';
import ResultsModal from './components/ResultsModal';
import StatsOverview from './components/StatsOverview';
import { fetchAllData, getCachedData } from './api/wca';

function App() {
  const [tab, setTab] = useState('year');
  const [country, setCountry] = useState('PL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedCompetition, setSelectedCompetition] = useState(null);

  useEffect(() => {
    const loadCachedData = async () => {
      const cached = await getCachedData(country, year);
      if (cached) {
        setData(cached);
      } else {
        setData(null);
      }
    };
    loadCachedData();
  }, [country, year]);

  const handleFetch = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setProgress(null);
    setData(null);

    try {
      const result = await fetchAllData(country, year, (p) => {
        setProgress(p);
      }, forceRefresh);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WCA Stats</h1>
          <p className="text-gray-600">Analiza danych zawodów speedcubingowych w Polsce</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('year')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              tab === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Rok
          </button>
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              tab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Statystyki
          </button>
        </div>

        {tab === 'year' && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <CountryPicker value={country} onChange={setCountry} disabled={loading} />
                <YearPicker value={year} onChange={setYear} disabled={loading} />
                <button
                  onClick={() => handleFetch(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg
                             hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                             disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Pobieranie...' : 'Odśwież'}
                </button>
              </div>

              {progress && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Pobieranie zawodów: {progress.current}/{progress.total}</span>
                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{progress.name}</div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="text-red-800 font-medium">Wystąpił błąd</div>
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            {data && (
              <div className="space-y-6">
                {data.cachedAt && (
                  <div className="text-xs text-gray-500 text-right">
                    Dane z cache: {new Date(data.cachedAt).toLocaleString('pl-PL')}
                  </div>
                )}
                <StatsSummary data={data} />
                <Chart data={data.chartData} />
                <CompetitionList
                  competitions={data.competitions}
                  onCompetitionClick={setSelectedCompetition}
                />
              </div>
            )}
          </>
        )}

        {tab === 'overview' && <StatsOverview />}
      </div>

      {selectedPerson && (
        <PersonModal
          wcaId={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}

      {selectedCompetition && (
        <ResultsModal
          competition={selectedCompetition}
          onClose={() => setSelectedCompetition(null)}
          onPersonClick={(wcaId) => {
            setSelectedPerson(wcaId);
          }}
        />
      )}
    </div>
  );
}

export default App;

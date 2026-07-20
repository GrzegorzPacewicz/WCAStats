import { useState, useEffect } from 'react';
import CountryPicker from './components/CountryPicker';
import YearPicker from './components/YearPicker';
import StatsSummary from './components/StatsSummary';
import CompetitionList from './components/CompetitionList';
import Chart from './components/Chart';
import PersonModal from './components/PersonModal';
import ResultsModal from './components/ResultsModal';
import StatsOverview from './components/StatsOverview';
import AdminPanel from './components/AdminPanel';
import { getCachedData, getLastUpdateTime } from './api/wca';

function App() {
  const [tab, setTab] = useState('year');
  const [country, setCountry] = useState('PL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    getLastUpdateTime('PL').then(setLastUpdate);
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WCA Stats</h1>
          <p className="text-gray-600">Analiza danych zawodów speedcubingowych w Polsce</p>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-1">
              Ostatnia aktualizacja: {new Date(lastUpdate).toLocaleString('pl-PL')}
            </p>
          )}
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
          <button
            onClick={() => setTab('admin')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              tab === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Admin
          </button>
        </div>

        {tab === 'year' && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <CountryPicker value={country} onChange={setCountry} />
                <YearPicker value={year} onChange={setYear} />
              </div>
            </div>

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

        {tab === 'admin' && <AdminPanel />}
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

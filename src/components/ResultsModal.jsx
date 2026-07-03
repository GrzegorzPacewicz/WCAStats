import { useState, useEffect } from 'react';
import { fetchCompetitionResults } from '../api/wca';

const EVENT_NAMES = {
  '333': '3x3x3',
  '222': '2x2x2',
  '444': '4x4x4',
  '555': '5x5x5',
  '666': '6x6x6',
  '777': '7x7x7',
  '333bf': '3x3 BLD',
  '333fm': '3x3 FMC',
  '333oh': '3x3 OH',
  'clock': 'Clock',
  'minx': 'Megaminx',
  'pyram': 'Pyraminx',
  'skewb': 'Skewb',
  'sq1': 'Square-1',
  '444bf': '4x4 BLD',
  '555bf': '5x5 BLD',
  '333mbf': '3x3 Multi-BLD',
};

const ROUND_NAMES = {
  'f': 'Finał',
  '1': 'Runda 1',
  '2': 'Runda 2',
  '3': 'Runda 3',
  'd': 'Dogrywka',
  'c': 'Finał (combined)',
};

function formatTime(centiseconds) {
  if (centiseconds === -1) return 'DNF';
  if (centiseconds === -2) return 'DNS';
  if (centiseconds === 0) return '-';

  const totalSeconds = centiseconds / 100;
  if (totalSeconds < 60) {
    return totalSeconds.toFixed(2);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${seconds}`;
}

export default function ResultsModal({ competition, onClose, onPersonClick }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCompetitionResults(competition.id);
        setResults(data);
        const events = [...new Set(data.map(r => r.event_id))];
        if (events.length > 0) {
          setSelectedEvent(events.includes('333') ? '333' : events[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [competition.id]);

  const events = results ? [...new Set(results.map(r => r.event_id))] : [];
  const filteredResults = results?.filter(r => r.event_id === selectedEvent) || [];

  const rounds = [...new Set(filteredResults.map(r => r.round_type_id))];
  const finalRound = rounds.includes('f') ? 'f' : rounds.includes('c') ? 'c' : rounds[rounds.length - 1];
  const finalResults = filteredResults
    .filter(r => r.round_type_id === finalRound)
    .sort((a, b) => a.pos - b.pos);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{competition.name}</h2>
            <div className="text-sm text-gray-500">{competition.start_date}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading && <div className="text-center py-8 text-gray-500">Ładowanie wyników...</div>}

          {error && <div className="text-red-600">{error}</div>}

          {results && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {events.map((eventId) => (
                  <button
                    key={eventId}
                    onClick={() => setSelectedEvent(eventId)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                      ${selectedEvent === eventId
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {EVENT_NAMES[eventId] || eventId}
                  </button>
                ))}
              </div>

              {finalResults.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">
                    {EVENT_NAMES[selectedEvent] || selectedEvent} — {ROUND_NAMES[finalRound] || finalRound}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-600">
                          <th className="text-left py-2 px-2 w-12">#</th>
                          <th className="text-left py-2 px-2">Zawodnik</th>
                          <th className="text-right py-2 px-2">Single</th>
                          <th className="text-right py-2 px-2">Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalResults.slice(0, 20).map((result, idx) => (
                          <tr key={result.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-500">{result.pos}</td>
                            <td className="py-2 px-2">
                              {result.wca_id ? (
                                <button
                                  onClick={() => onPersonClick(result.wca_id)}
                                  className="text-blue-600 hover:underline text-left"
                                >
                                  {result.name}
                                </button>
                              ) : (
                                <span className="text-gray-900">{result.name}</span>
                              )}
                              <span className="text-gray-400 text-xs ml-2">{result.country_iso2}</span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {formatTime(result.best)}
                              {result.regional_single_record && (
                                <span className="ml-1 text-xs text-red-600 font-bold">
                                  {result.regional_single_record}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {formatTime(result.average)}
                              {result.regional_average_record && (
                                <span className="ml-1 text-xs text-red-600 font-bold">
                                  {result.regional_average_record}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {finalResults.length > 20 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        ...i {finalResults.length - 20} więcej
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

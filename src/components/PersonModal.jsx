import { useState, useEffect } from 'react';
import { fetchPerson } from '../api/wca';

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

export default function PersonModal({ wcaId, onClose }) {
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPerson(wcaId);
        setPerson(data.person);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wcaId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Profil zawodnika</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
          {loading && <div className="text-center py-8 text-gray-500">Ładowanie...</div>}

          {error && <div className="text-red-600">{error}</div>}

          {person && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {person.avatar?.thumb_url && (
                  <img
                    src={person.avatar.thumb_url}
                    alt={person.name}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <div className="text-xl font-bold text-gray-900">{person.name}</div>
                  <div className="text-gray-600">{person.wca_id}</div>
                  <div className="text-sm text-gray-500">{person.country?.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{person.competition_count || 0}</div>
                  <div className="text-xs text-gray-600">Zawody</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{person.medals?.total || 0}</div>
                  <div className="text-xs text-gray-600">Medale</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{person.records?.total || 0}</div>
                  <div className="text-xs text-gray-600">Rekordy</div>
                </div>
              </div>

              {person.medals && (person.medals.gold > 0 || person.medals.silver > 0 || person.medals.bronze > 0) && (
                <div className="flex justify-center gap-6">
                  <span className="text-yellow-500">🥇 {person.medals.gold}</span>
                  <span className="text-gray-400">🥈 {person.medals.silver}</span>
                  <span className="text-orange-600">🥉 {person.medals.bronze}</span>
                </div>
              )}

              {person.personal_records && Object.keys(person.personal_records).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Rekordy osobiste</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2">Event</th>
                          <th className="text-right py-2 px-2">Single</th>
                          <th className="text-right py-2 px-2">Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(person.personal_records).map(([eventId, record]) => (
                          <tr key={eventId} className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-900">
                              {EVENT_NAMES[eventId] || eventId}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {record.single ? formatTime(record.single.best) : '-'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {record.average ? formatTime(record.average.best) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="text-center">
                <a
                  href={person.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Zobacz pełny profil na WCA →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

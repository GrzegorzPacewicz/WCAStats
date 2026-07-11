export default function CompetitionList({ competitions, onCompetitionClick }) {
  if (!competitions || competitions.length === 0) return null;

  const sorted = [...competitions].sort(
    (a, b) => new Date(a.start_date) - new Date(b.start_date)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Lista zawodów</h2>
        <p className="text-xs text-gray-500">Kliknij na zawody aby zobaczyć wyniki</p>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {sorted.map((comp) => (
          <button
            key={comp.id}
            onClick={() => onCompetitionClick(comp)}
            className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="font-medium text-gray-900">{comp.name}</div>
              <span className="text-gray-400 flex-shrink-0">→</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">{comp.start_date}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${comp.error ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
              >
                {comp.competitorCount} uczestników
              </span>
              {comp.newcomerCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {comp.newcomerCount} nowych
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

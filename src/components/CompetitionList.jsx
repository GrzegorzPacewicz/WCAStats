export default function CompetitionList({ competitions }) {
  if (!competitions || competitions.length === 0) return null;

  const sorted = [...competitions].sort(
    (a, b) => new Date(a.start_date) - new Date(b.start_date)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Lista zawodów</h2>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {sorted.map((comp) => (
          <div
            key={comp.id}
            className="px-4 py-3 flex justify-between items-center hover:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{comp.name}</div>
              <div className="text-sm text-gray-500">{comp.start_date}</div>
            </div>
            <div className="ml-4 flex-shrink-0">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${comp.error ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
              >
                {comp.competitorCount} uczestników
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

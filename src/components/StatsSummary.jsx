export default function StatsSummary({ data }) {
  if (!data) return null;

  const stats = [
    { label: 'Unikalni zawodnicy', value: data.totalCompetitors },
    { label: 'Mężczyźni', value: data.males },
    { label: 'Kobiety', value: data.females },
    { label: 'Nowi zawodnicy', value: data.newcomers },
    { label: 'Zawody', value: data.competitions.length },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
        >
          <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

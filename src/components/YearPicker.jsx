export default function YearPicker({ value, onChange, disabled }) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2003; y--) {
    years.push(y);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Rok</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

const COUNTRIES = [
  { code: 'PL', name: 'Polska' },
  { code: 'DE', name: 'Niemcy' },
  { code: 'CZ', name: 'Czechy' },
  { code: 'SK', name: 'Słowacja' },
  { code: 'UA', name: 'Ukraina' },
  { code: 'US', name: 'USA' },
  { code: 'CN', name: 'Chiny' },
  { code: 'JP', name: 'Japonia' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazylia' },
  { code: 'FR', name: 'Francja' },
  { code: 'GB', name: 'Wielka Brytania' },
  { code: 'ES', name: 'Hiszpania' },
  { code: 'IT', name: 'Włochy' },
];

export default function CountryPicker({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Kraj</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

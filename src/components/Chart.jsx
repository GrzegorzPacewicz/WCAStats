import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from './chartStyles';

export default function Chart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <h2 className="font-semibold text-gray-900 mb-4">Zawody w miesiącach</h2>
      <div className="h-64 [&_svg]:outline-none [&_*]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} domain={[0, 'auto']} />
            <Tooltip
              cursor={false}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={{ color: '#3b82f6' }}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

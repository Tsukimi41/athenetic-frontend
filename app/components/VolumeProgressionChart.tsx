'use client';

import type { CSSProperties } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export type VolumeTrendPoint = {
  week_start: string;
  chest: number;
  back: number;
  legs: number;
};

interface VolumeProgressionChartProps {
  data: VolumeTrendPoint[];
  loading: boolean;
  error: string | null;
}

const tooltipStyle: CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  border: '1px solid #E5E5EA',
  borderRadius: 12,
  padding: '8px 10px',
  backdropFilter: 'blur(12px)',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={tooltipStyle}>
      <p className="text-xs text-[#86868B] mb-2">Week of {label}</p>
      <div className="space-y-1 text-sm">
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between" style={{ color: entry.color }}>
            <span className="font-semibold">{entry.name}</span>
            <span>{Math.round(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VolumeProgressionChart({ data, loading, error }: VolumeProgressionChartProps) {
  if (loading) {
    return <p className="text-sm text-[#86868B]">Loading trend...</p>;
  }

  if (error) {
    return <p className="text-sm text-[#FF3B30] font-medium">{error}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-[#86868B]">No volume trend yet.</p>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E5E5EA" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="week_start"
            tick={{ fontSize: 10, fill: '#86868B' }}
            tickFormatter={(value) => String(value).slice(5)}
          />
          <YAxis tick={{ fontSize: 10, fill: '#86868B' }} width={40} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E5EA', strokeDasharray: '4 4' }} />
          <Line type="monotone" dataKey="chest" name="Chest" stroke="#FF3B30" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="back" name="Back" stroke="#0071E3" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="legs" name="Legs" stroke="#34C759" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

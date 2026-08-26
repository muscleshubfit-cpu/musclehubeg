"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * Weight chart for the coach client detail view.
 * Extracted into its own file so recharts (~600KB) can be code-split
 * out of the main bundle and only loaded when the coach opens a
 * client's progress tab.
 */
export function ClientWeightChart({ data }: { data: Array<{ date: string; weight: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="clientWeight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F8FFF" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#1F8FFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#475569" }} />
        <YAxis tick={{ fontSize: 12, fill: "#475569" }} domain={["auto", "auto"]} />
        <Tooltip />
        <Area type="monotone" dataKey="weight" stroke="#1F8FFF" strokeWidth={2.5} fill="url(#clientWeight)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

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
 * WeightChart — lazy-loaded chart component for ProgressView.
 *
 * Extracted into its own file so recharts (~600KB) can be code-split
 * out of the main bundle and only loaded when the user actually opens
 * the Progress page.
 */
export function WeightChart({ data }: { data: Array<{ date: string; weight: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0071e3" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#d2d2d7" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6e6e73" }} />
        <YAxis tick={{ fontSize: 12, fill: "#6e6e73" }} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #d2d2d7",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        <Area type="monotone" dataKey="weight" stroke="#0071e3" strokeWidth={2.5} fill="url(#weightGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

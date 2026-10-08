"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Report charts. Colors: the validated women/men pair (passes lightness, chroma, CVD and
 * contrast checks on white) — the same tokens as the seat bars. Single-series charts use one
 * neutral brand hue and no legend; every chart has a table view for screen readers / print.
 */
const WOMEN = "#0a7d5e";
const MEN = "#7a9e0f";
const SINGLE = "#2f5f53";
const INK = "#10241f";
const MUTED = "#5b6f69";
const GRID = "#e6edea";

type Labels = { women: string; men: string; table: string; total: string; target: string; percent: string; count: string };

const axisProps = { tick: { fill: MUTED, fontSize: 12 }, axisLine: false, tickLine: false } as const;
const tooltipProps = {
  cursor: { fill: "rgba(28,75,64,0.06)" },
  contentStyle: { borderRadius: 12, border: "1px solid #dde7e3", fontSize: 13, color: INK, boxShadow: "0 4px 16px rgba(0,0,0,.08)" },
  labelStyle: { fontWeight: 700, color: INK },
} as const;

function ChartCard({ title, children, table }: { title: string; children: ReactNode; table: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-secondary">{title}</h2>
      {children}
      {table}
    </section>
  );
}

function DataTable({ summary, head, rows }: { summary: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">{summary}</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr>{head.map((h) => <th key={h} className="border-b border-border py-1 pr-3 text-xs text-muted-foreground">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-border py-1 pr-3">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function GenderReport({ title, data, labels }: { title: string; data: { label: string; women: number; men: number }[]; labels: Labels }) {
  return (
    <ChartCard
      title={title}
      table={<DataTable summary={labels.table} head={["", labels.women, labels.men]} rows={data.map((d) => [d.label, d.women, d.men])} />}
    >
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} barGap={2} barCategoryGap="30%" margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: MUTED }} />
            <Bar dataKey="women" name={labels.women} fill={WOMEN} radius={[4, 4, 0, 0]} maxBarSize={36}>
              <LabelList dataKey="women" position="top" fill={INK} fontSize={12} />
            </Bar>
            <Bar dataKey="men" name={labels.men} fill={MEN} radius={[4, 4, 0, 0]} maxBarSize={36}>
              <LabelList dataKey="men" position="top" fill={INK} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function BarReport({ title, data, labels }: { title: string; data: { label: string; value: number }[]; labels: Labels }) {
  const height = Math.max(160, data.length * 34 + 30);
  return (
    <ChartCard title={title} table={<DataTable summary={labels.table} head={["", labels.count]} rows={data.map((d) => [d.label, d.value])} />}>
      <div style={{ height }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="label" width={110} {...axisProps} />
            <Tooltip {...tooltipProps} formatter={(v) => [v, labels.count]} />
            <Bar dataKey="value" name={labels.count} fill={SINGLE} radius={[0, 4, 4, 0]} maxBarSize={20}>
              <LabelList dataKey="value" position="right" fill={INK} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function WomenShareReport({ title, data, labels }: { title: string; data: { label: string; value: number; total: number }[]; labels: Labels }) {
  const height = Math.max(160, data.length * 34 + 40);
  return (
    <ChartCard
      title={title}
      table={<DataTable summary={labels.table} head={["", labels.percent, labels.total]} rows={data.map((d) => [d.label, `${d.value}%`, d.total])} />}
    >
      <div style={{ height }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 16, right: 40, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} />
            <YAxis type="category" dataKey="label" width={130} {...axisProps} tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)} />
            <Tooltip {...tooltipProps} formatter={(v) => [`${v}%`, labels.percent]} />
            <ReferenceLine x={75} stroke={INK} strokeDasharray="4 4" label={{ value: labels.target, position: "top", fill: MUTED, fontSize: 11 }} />
            <Bar dataKey="value" name={labels.percent} fill={WOMEN} radius={[0, 4, 4, 0]} maxBarSize={20}>
              <LabelList dataKey="value" position="right" fill={INK} fontSize={12} formatter={(v) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

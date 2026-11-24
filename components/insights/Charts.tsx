"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHeadColor } from "@/lib/client/colors";
import { MONTH_SHORT, formatClaimedLabel } from "@/lib/client/format";
import { FilterState, Stats } from "@/lib/client/types";

interface ChartsProps {
  stats: Stats;
  filters: FilterState;
  onApplyFilter: (patch: Partial<FilterState>) => void;
}

const CLAIMED_COLORS = [
  "#4F46E5",
  "#0D9488",
  "#D97706",
  "#E11D48",
  "#7C3AED",
  "#0284C7",
  "#64748B",
];

export function Charts({ stats, filters, onApplyFilter }: ChartsProps) {
  const yearlyData = useMemo(() => {
    return stats.byYear.map((item) => ({
      year: String(item.value),
      yearNum: item.value,
      Major: item.major,
      Other: Math.max(0, item.count - item.major),
    }));
  }, [stats.byYear]);

  const monthlyData = useMemo(() => {
    const map = new Map<number, number>();
    stats.byMonth.forEach((m) => map.set(Number(m.value), m.count));
    return MONTH_SHORT.map((name, idx) => ({
      month: name,
      monthNum: idx + 1,
      Incidents: map.get(idx + 1) || 0,
    }));
  }, [stats.byMonth]);

  const headData = useMemo(() => {
    return stats.byHead.slice(0, 10).map((h) => ({
      name: String(h.value),
      count: h.count,
      fill: getHeadColor(String(h.value)),
    }));
  }, [stats.byHead]);

  const districtData = useMemo(() => {
    return stats.byDistrict.slice(0, 10).map((d) => ({
      name: String(d.value),
      count: d.count,
    }));
  }, [stats.byDistrict]);

  const targetData = useMemo(() => {
    return stats.byTarget.slice(0, 8).map((t) => ({
      name: String(t.value),
      count: t.count,
    }));
  }, [stats.byTarget]);

  const claimedData = useMemo(() => {
    return stats.byClaimed.slice(0, 7).map((c) => ({
      raw: String(c.value),
      name: formatClaimedLabel(c.value),
      value: c.count,
    }));
  }, [stats.byClaimed]);

  const toggleYear = (yr: number) => {
    const exists = filters.year.includes(yr);
    onApplyFilter({
      year: exists
        ? filters.year.filter((y) => y !== yr)
        : [...filters.year, yr],
    });
  };

  const toggleHead = (head: string) => {
    const exists = filters.head.includes(head);
    onApplyFilter({
      head: exists
        ? filters.head.filter((h) => h !== head)
        : [...filters.head, head],
    });
  };

  const toggleDistrict = (dist: string) => {
    const exists = filters.district.includes(dist);
    onApplyFilter({
      district: exists
        ? filters.district.filter((d) => d !== dist)
        : [...filters.district, dist],
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Incidents by Year */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Incidents by Year
          </h3>
          <span className="text-[11px] text-slate-400">Click bar to filter</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={yearlyData}
              onClick={(state) => {
                const payload = state?.activePayload?.[0]?.payload as
                  | { yearNum?: number }
                  | undefined;
                if (payload?.yearNum) toggleYear(payload.yearNum);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "#cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                dataKey="Major"
                stackId="a"
                fill="#E5484D"
                radius={[0, 0, 0, 0]}
                className="cursor-pointer"
              />
              <Bar
                dataKey="Other"
                stackId="a"
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incidents by Month */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Incidents by Month
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "#cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="Incidents" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By Head of Crime */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            By Head of Crime
          </h3>
          <span className="text-[11px] text-slate-400">Click bar to filter</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={headData}
              layout="vertical"
              margin={{ left: 16, right: 16 }}
              onClick={(state) => {
                const payload = state?.activePayload?.[0]?.payload as
                  | { name?: string }
                  | undefined;
                if (payload?.name) toggleHead(payload.name);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={145}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "#cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]} className="cursor-pointer">
                {headData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Districts */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Top Districts
          </h3>
          <span className="text-[11px] text-slate-400">Click bar to filter</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={districtData}
              layout="vertical"
              margin={{ left: 16, right: 16 }}
              onClick={(state) => {
                const payload = state?.activePayload?.[0]?.payload as
                  | { name?: string }
                  | undefined;
                if (payload?.name) toggleDistrict(payload.name);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={135}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "#cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="count"
                name="Incidents"
                fill="#3E63DD"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Targets */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Top Targets
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={targetData}
              layout="vertical"
              margin={{ left: 12, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "#cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="count"
                name="Incidents"
                fill="#8E4EC6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Claimed By Donut */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Responsibility Claims
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={claimedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={2}
              >
                {claimedData.map((entry, idx) => (
                  <Cell
                    key={entry.raw}
                    fill={CLAIMED_COLORS[idx % CLAIMED_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "#cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { formatNumber } from "@/lib/client/format";
import { Stats } from "@/lib/client/types";

interface CasualtyTableProps {
  rows: Stats["yearlyCasualties"];
}

export function CasualtyTable({ rows }: CasualtyTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Yearly Casualty Summary
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Officially compiled annual figures across Sindh
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2.5">Year</th>
              <th className="px-4 py-2.5 text-right">Civilian Martyred</th>
              <th className="px-4 py-2.5 text-right">Civilian Injured</th>
              <th className="px-4 py-2.5 text-right">LEAs Martyred</th>
              <th className="px-4 py-2.5 text-right">LEAs Injured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  No annual summary data available
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.year}
                  className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-900/50"
                >
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {row.year}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatNumber(row.civilian_martyred)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatNumber(row.civilian_injured)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatNumber(row.leas_martyred)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatNumber(row.leas_injured)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

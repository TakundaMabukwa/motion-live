"use client";

import React from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendColor?: string;
  valueColor?: string;
}

export function StatsCard({ title, value, subtitle, icon, trend, trendColor = "text-green-600", valueColor = "text-gray-900" }: StatsCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col justify-between min-h-[80px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{title}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className={`text-lg font-bold ${valueColor}`}>{value}</div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 mt-0.5">
          {trend && <span className={`text-[9px] font-medium ${trendColor}`}>{trend}</span>}
          {subtitle && <span className="text-[9px] text-gray-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

interface TableColumn {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface FCDataTableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  keyExtractor?: (row: any) => string;
  maxRows?: number;
}

export function FCDataTable({ columns, data, loading, emptyMessage = "No data found.", onRowClick, keyExtractor, maxRows }: FCDataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center text-xs text-gray-500 py-8">{emptyMessage}</div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-gray-50 z-10">
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider ${col.headerClassName || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.slice(0, maxRows).map((row, idx) => (
            <tr
              key={keyExtractor ? keyExtractor(row) : idx}
              onClick={() => onRowClick?.(row)}
              className={`hover:bg-gray-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-2 py-2 text-gray-700 ${col.className || ""}`}>
                  <div className="truncate max-w-[150px]" title={String(row[col.key] ?? "")}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "N/A")}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-[10px] text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

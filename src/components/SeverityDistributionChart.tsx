import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { SeverityDistributionItem } from '../types/inspection';
import { PieChart as PieIcon, Maximize2, Minimize2 } from 'lucide-react';

interface SeverityDistributionChartProps {
  data: SeverityDistributionItem[];
  isLoading?: boolean;
  filterSlot?: React.ReactNode;
}

export const SeverityDistributionChart: React.FC<SeverityDistributionChartProps> = ({
  data,
  isLoading = false,
  filterSlot,
}) => {
  const [isFullsize, setIsFullsize] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs min-h-[400px] flex flex-col w-full min-w-0 overflow-hidden">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-6" />
        <div className="flex-1 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  const hasData = totalCount > 0;
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const chartCard = (
    <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col w-full min-w-0 overflow-hidden ${isFullsize ? 'h-full max-h-[85vh]' : 'min-h-[400px]'}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
            Severity Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            Proportion of equipment condition ratings
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <PieIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ratings</span>
          </div>

          <button
            onClick={() => setIsFullsize(!isFullsize)}
            title={isFullsize ? 'Tutup Fullsize' : 'Mode Diagram Fullsize'}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            {isFullsize ? (
              <Minimize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {filterSlot && (
        <div className="mb-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          {filterSlot}
        </div>
      )}

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-850/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-750 min-h-[220px]">
          <PieIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            No inspection data available
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Ratings will form the severity breakdown chart.
          </p>
        </div>
      ) : (
        <div className="w-full h-[280px] sm:h-[300px] flex flex-col sm:flex-row items-center justify-between gap-4 min-w-0 mt-auto">
          {/* Donut Chart */}
          <div className="relative w-full sm:w-1/2 h-44 sm:h-full min-h-[180px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  dataKey="count"
                >
                  {data.map((entry) => (
                    <Cell key={`cell-${entry.rating}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, props: any) => [
                    `${val} inspection(s) (${props.payload.percentage}%)`,
                    props.payload.name,
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    color: isDark ? '#F8FAFC' : '#1E293B',
                  }}
                  itemStyle={{ color: isDark ? '#F1F5F9' : '#1E293B' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {totalCount}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>

          {/* Clean Legend & Details */}
          <div className="w-full sm:w-1/2 flex flex-col gap-2.5 pr-2 min-w-0">
            {data.map((item) => (
              <div
                key={item.rating}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {item.count}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 w-9 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isFullsize) {
    return (
      <>
        <div className="p-4 rounded-xl border border-dashed border-blue-300 dark:border-blue-750 bg-blue-50/30 dark:bg-blue-950/20 text-center text-xs text-blue-600 dark:text-blue-400 font-medium">
          Diagram Keparahan sedang ditampilkan dalam mode Fullsize.
        </div>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-full flex flex-col">
            {chartCard}
          </div>
        </div>
      </>
    );
  }

  return chartCard;
};

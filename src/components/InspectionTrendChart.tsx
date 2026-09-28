import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendDataPoint } from '../types/inspection';
import { BarChart3, Maximize2, Minimize2 } from 'lucide-react';

interface InspectionTrendChartProps {
  data: TrendDataPoint[];
  isLoading?: boolean;
  filterSlot?: React.ReactNode;
}

export const InspectionTrendChart: React.FC<InspectionTrendChartProps> = ({
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

  const hasData = Boolean(data && data.length > 0);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const chartCard = (
    <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col w-full min-w-0 overflow-hidden ${isFullsize ? 'h-full max-h-[85vh]' : 'min-h-[400px]'}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
            Inspection Trend Analysis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            Monthly inspection volume by condition severity
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Volume</span>
          </div>

          <button
            onClick={() => setIsFullsize(!isFullsize)}
            title={isFullsize ? 'Tutup Fullsize' : 'Mode Grafik Fullsize'}
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
          <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            No inspection data available
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Data from inspection records will populate trends automatically.
          </p>
        </div>
      ) : (
        <div className="w-full h-[280px] sm:h-[300px] min-w-0 mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#E2E8F0'} />
              <XAxis
                dataKey="period"
                stroke={isDark ? '#94A3B8' : '#64748B'}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: isDark ? '#475569' : '#CBD5E1' }}
              />
              <YAxis
                stroke={isDark ? '#94A3B8' : '#64748B'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
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
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              <Bar dataKey="normal" name="A - Normal" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="caution" name="B - Caution" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="critical" name="C - Critical" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="severe" name="X - Severe" stackId="a" fill="#09090B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  if (isFullsize) {
    return (
      <>
        <div className="p-4 rounded-xl border border-dashed border-blue-300 dark:border-blue-750 bg-blue-50/30 dark:bg-blue-950/20 text-center text-xs text-blue-600 dark:text-blue-400 font-medium">
          Grafik Tren sedang ditampilkan dalam mode Fullsize.
        </div>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-6xl h-full flex flex-col">
            {chartCard}
          </div>
        </div>
      </>
    );
  }

  return chartCard;
};

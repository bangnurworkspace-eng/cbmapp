import React from 'react';

export type CardVariant = 
  | 'default'
  | 'normal'    // soft green
  | 'caution'   // soft yellow
  | 'critical'  // soft orange
  | 'severe'    // soft red
  | 'info'      // soft blue
  | 'accent';   // soft purple

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: CardVariant;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  description,
  icon: Icon,
  variant = 'default',
  isLoading = false,
}) => {
  // Pastel/soft industrial styling colors with high contrast for maximum readability
  const getVariantStyles = () => {
    switch (variant) {
      case 'normal':
        return {
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
          border: 'border-emerald-200 dark:border-emerald-800/80',
          iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300',
          valueColor: 'text-emerald-700 dark:text-emerald-300',
          labelColor: 'text-emerald-800 dark:text-emerald-300',
          descColor: 'text-emerald-700/80 dark:text-emerald-400/80',
        };
      case 'caution':
        return {
          bg: 'bg-amber-50/70 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-800/80',
          iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-300',
          valueColor: 'text-amber-700 dark:text-amber-300',
          labelColor: 'text-amber-800 dark:text-amber-300',
          descColor: 'text-amber-700/80 dark:text-amber-400/80',
        };
      case 'critical':
        return {
          bg: 'bg-red-50/80 dark:bg-red-950/40',
          border: 'border-red-200 dark:border-red-800/80',
          iconBg: 'bg-red-100 text-red-700 dark:bg-red-900/80 dark:text-red-300',
          valueColor: 'text-red-700 dark:text-red-400',
          labelColor: 'text-red-800 dark:text-red-300',
          descColor: 'text-red-700/80 dark:text-red-400/80',
        };
      case 'severe':
        return {
          bg: 'bg-slate-950/90 dark:bg-black/95',
          border: 'border-slate-800 dark:border-zinc-800',
          iconBg: 'bg-slate-800 text-red-500 dark:bg-zinc-900 dark:text-red-500',
          valueColor: 'text-white dark:text-slate-100',
          labelColor: 'text-slate-200 dark:text-slate-200',
          descColor: 'text-slate-400 dark:text-slate-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-50/70 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-800/80',
          iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-300',
          valueColor: 'text-blue-700 dark:text-blue-300',
          labelColor: 'text-blue-800 dark:text-blue-300',
          descColor: 'text-blue-700/80 dark:text-blue-400/80',
        };
      case 'accent':
        return {
          bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
          border: 'border-indigo-200 dark:border-indigo-800/80',
          iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300',
          valueColor: 'text-indigo-700 dark:text-indigo-300',
          labelColor: 'text-indigo-800 dark:text-indigo-300',
          descColor: 'text-indigo-700/80 dark:text-indigo-400/80',
        };
      default:
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-200 dark:border-slate-800',
          iconBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
          valueColor: 'text-slate-900 dark:text-white',
          labelColor: 'text-slate-700 dark:text-slate-300',
          descColor: 'text-slate-500 dark:text-slate-400',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className={`relative p-4 sm:p-4.5 rounded-2xl border ${styles.border} ${styles.bg} shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between w-full min-w-0`}
    >
      {/* Top Header: Label & Icon */}
      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
        <span
          className={`text-xs sm:text-[12px] font-bold tracking-wider uppercase leading-snug break-words ${styles.labelColor}`}
        >
          {label}
        </span>
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-xl ${styles.iconBg} shrink-0`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Main Value Display */}
      <div className="flex flex-col mt-auto pt-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          {isLoading ? (
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse my-0.5" />
          ) : (
            <span
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${styles.valueColor}`}
            >
              {value}
            </span>
          )}
          {unit && !isLoading && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {unit}
            </span>
          )}
        </div>

        {/* Optional Description / Context */}
        {description && (
          <span className={`text-[11px] font-medium mt-1 leading-none ${styles.descColor}`}>
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

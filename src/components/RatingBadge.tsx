import React from 'react';
import { Rating } from '../types/inspection';
import { normalizeRating, getRatingDisplayLabel } from '../utils/calculations';

interface RatingBadgeProps {
  rating: Rating | string | undefined;
  showFullText?: boolean;
  className?: string;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  showFullText = true,
  className = '',
}) => {
  const normRating = normalizeRating(rating);
  const displayLabel = getRatingDisplayLabel(normRating);

  let style = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
  let dotColor = 'bg-emerald-500';

  if (normRating === 'B') {
    style = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    dotColor = 'bg-amber-500';
  } else if (normRating === 'C') {
    style = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/80';
    dotColor = 'bg-red-600';
  } else if (normRating === 'X') {
    style = 'bg-slate-900 text-slate-100 border-slate-950 dark:bg-black dark:text-white dark:border-zinc-700';
    dotColor = 'bg-red-500';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {showFullText ? displayLabel : normRating}
    </span>
  );
};

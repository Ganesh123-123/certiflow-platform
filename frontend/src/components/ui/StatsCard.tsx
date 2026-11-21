import React from 'react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo';
  subtitle?: string;
  trend?: string;
  to?: string;
}

const colorMap = {
  blue:   { iconBg: 'bg-blue-50',   iconText: 'text-blue-700',   accent: 'bg-blue-500' },
  green:  { iconBg: 'bg-emerald-50',iconText: 'text-emerald-700',accent: 'bg-emerald-500' },
  yellow: { iconBg: 'bg-amber-50',  iconText: 'text-amber-700',  accent: 'bg-amber-500' },
  purple: { iconBg: 'bg-violet-50', iconText: 'text-violet-700', accent: 'bg-violet-500' },
  red:    { iconBg: 'bg-rose-50',   iconText: 'text-rose-700',   accent: 'bg-rose-500' },
  indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-700', accent: 'bg-indigo-500' },
};

export function StatsCard({ title, value, icon: Icon, color, subtitle, trend, to }: StatsCardProps) {
  const c = colorMap[color];
  const content = (
    <div className={clsx(
      'group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,0.035)] transition-all duration-200 sm:p-5',
      to && 'hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.09)]'
    )}>
      <div className={clsx('absolute inset-x-0 top-0 h-[2px] opacity-70 transition-opacity group-hover:opacity-100', c.accent)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.13em] text-slate-500 sm:text-[11px]">{title}</p>
          <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-slate-950 tabular-nums sm:text-[2rem]">{value}</p>
          {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
          {trend && <p className="mt-2 text-xs font-semibold text-emerald-700">{trend}</p>}
        </div>
        <div className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11', c.iconBg)}>
          <Icon className={clsx('h-[18px] w-[18px]', c.iconText)} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );

  if (!to) return content;

  return (
    <Link
      to={to}
      aria-label={`${title}: ${value}. View details`}
      className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      {content}
    </Link>
  );
}

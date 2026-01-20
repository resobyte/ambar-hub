import { ReactNode } from 'react';

interface InfoCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function InfoCard({ title, value, icon, trend, className }: InfoCardProps) {
  return (
    <div className={`bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow ${className || ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        </div>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`${trend.isPositive ? 'text-success' : 'text-destructive'} font-medium mr-2`}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
          <span className="text-muted-foreground">from last month</span>
        </div>
      )}
    </div>
  );
}

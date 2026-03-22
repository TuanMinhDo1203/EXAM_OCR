import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'danger';
}

export function KpiCard({ title, value, trend, icon, subtitle, variant = 'default' }: KpiCardProps) {
  const getIconColor = () => {
    switch (variant) {
      case 'warning': return 'text-orange-600 bg-orange-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        {icon && (
          <div className={`p-2 rounded-lg ${getIconColor()}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-gray-400 text-xs mt-2">{subtitle}</p>}
    </div>
  );
}

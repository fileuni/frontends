import React from 'react';
import { AdminCard } from '../../admin-ui';

type StatItem = {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
};

export const WebStatsGrid = ({ items }: { items: StatItem[] }) => {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => (
        <AdminCard key={item.label} variant="shadcn" className="rounded-2xl p-4">
          <p className="text-sm font-bold uppercase tracking-wider opacity-50">{item.label}</p>
          <p className={['mt-2 text-2xl font-black', item.valueClassName].filter(Boolean).join(' ')}>
            {item.value}
          </p>
        </AdminCard>
      ))}
    </div>
  );
};

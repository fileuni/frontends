import React from 'react';
import { cn } from '@/lib/utils';
import { AdminCard } from './AdminCard';
import { AdminPageHeader } from './AdminPageHeader';

type Props = {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  className?: string | undefined;
  iconClassName?: string | undefined;
};

export const AdminHero = ({ icon, title, subtitle, actions, className, iconClassName }: Props) => {
  return (
    <AdminCard
      variant="shadcn"
      className={cn('rounded-[2rem] p-6', className)}
    >
      <AdminPageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        actions={actions}
        iconClassName={iconClassName}
      />
    </AdminCard>
  );
};

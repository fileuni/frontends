import React from 'react';
import { cn } from '@/lib/utils';
import { DashboardCard, type DashboardCardVariant } from './DashboardCard';
import { DashboardSectionHeader } from './DashboardSectionHeader';

type Props = {
  children: React.ReactNode;

  variant?: DashboardCardVariant;
  className?: string;

  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;

  headerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export const DashboardSection: React.FC<Props> = ({
  children,
  variant = 'glass',
  className,
  title,
  subtitle,
  icon,
  actions,
  headerClassName,
  titleClassName,
  subtitleClassName,
}) => {
  const hasHeader = title !== undefined && title !== null;

  return (
    <DashboardCard variant={variant} className={className}>
      {hasHeader ? (
        <DashboardSectionHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          actions={actions}
          className={cn('mb-6', headerClassName)}
          titleClassName={titleClassName}
          subtitleClassName={subtitleClassName}
        />
      ) : null}
      {children}
    </DashboardCard>
  );
};

import React from 'react';
import { cn } from '@/lib/utils';
import { DashboardCard, type DashboardCardVariant } from './DashboardCard';
import { DashboardSectionHeader } from './DashboardSectionHeader';

type Props = {
  children: React.ReactNode;

  variant?: DashboardCardVariant | undefined;
  className?: string | undefined;

  title?: React.ReactNode | undefined;
  subtitle?: React.ReactNode | undefined;
  icon?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;

  headerClassName?: string | undefined;
  titleClassName?: string | undefined;
  subtitleClassName?: string | undefined;
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

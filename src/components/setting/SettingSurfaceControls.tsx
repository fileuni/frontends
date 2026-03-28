import React from 'react';
import { ThemeLanguageControls } from '@/components/public/components/ThemeLanguageControls';

interface SettingSurfaceControlsProps {
  className?: string;
  compact?: boolean;
}

export const SettingSurfaceControls: React.FC<SettingSurfaceControlsProps> = ({ className, compact = false }) => {
  return <ThemeLanguageControls className={className} compact={compact} />;
};

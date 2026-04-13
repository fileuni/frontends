import React from 'react';

import {
  PasswordInput as SharedPasswordInput,
  type PasswordInputProps,
  type PasswordToggleLabels,
} from '@fileuni/ts-shared/react-ui';

import { cn } from '@/lib/utils.ts';

export type Props = PasswordInputProps;

const FRONTEND_INPUT_CLASSNAME = [
  'h-12 rounded-xl border px-4 outline-none',
  'text-base font-semibold placeholder:font-normal',
  'border-[hsl(var(--input-border))] bg-[hsl(var(--input-background))] text-[hsl(var(--foreground))]',
  'placeholder:text-[hsl(var(--input-placeholder))]',
  'hover:border-[hsl(var(--input-border-hover))] hover:bg-[hsl(var(--input-background-hover))]',
  'focus:border-[hsl(var(--input-border-focus))] focus:ring-2 focus:ring-[hsl(var(--input-border-focus)/0.16)]',
  'disabled:cursor-not-allowed disabled:border-[hsl(var(--input-border))] disabled:bg-[hsl(var(--input-background-disabled))]',
  'disabled:text-[hsl(var(--input-disabled-foreground))]',
  'transition-[background-color,border-color,box-shadow,color] duration-200 ease-out',
].join(' ');

export const PasswordInput: React.FC<Props> = ({ inputClassName, ...props }) => (
  <SharedPasswordInput {...props} inputClassName={cn(FRONTEND_INPUT_CLASSNAME, inputClassName)} />
);

export type { PasswordToggleLabels };

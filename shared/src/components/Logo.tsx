import React from 'react';

/**
 * FileUni 统一 Logo 组件 / FileUni Unified Logo Component
 * 现代简约紫色风格（统一存储与模块化） / Modern minimalist purple style (Unified Storage & Modularity)
 */
export const Logo = ({ size = 32, className = "" }: { size?: number | string, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 128 128" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    {/* 背景渐变 / Modern Gradient Background */}
    <rect width="128" height="128" rx="32" fill="url(#fileuni-grad)" />
    
    {/* 统一文件容器 (U型) / Unified Container (U-shape) */}
    <path 
      d="M38 40V78C38 92.3594 49.6406 104 64 104C78.3594 104 90 92.3594 90 78V40" 
      stroke="white" 
      strokeWidth="12" 
      strokeLinecap="round" 
    />
    
    {/* 顶部折叠部分 / Document flap */}
    <path 
      d="M38 40H68L78 50V60" 
      stroke="white" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    
    {/* 核心数据点 / Core data point */}
    <circle cx="64" cy="78" r="8" fill="white" />

    <defs>
      <linearGradient id="fileuni-grad" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" /> {/* Indigo 500 */}
        <stop offset="1" stopColor="#A855F7" /> {/* Purple 500 */}
      </linearGradient>
    </defs>
  </svg>
);

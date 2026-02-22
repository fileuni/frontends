import React from 'react';

/**
 * RS-Core 统一 Logo 组件 / RS-Core Unified Logo Component
 * 现代简约蓝色风格（物联网与云存储） / Modern minimalist blue style (IoT & Cloud Storage)
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
    {/* 背景渐变 - 提升饱和度，更具现代科技感 / Modern Tech Gradient */}
    <rect width="128" height="128" rx="38" fill="url(#logo-grad-v5)" />
    
    {/* 现代云朵主体 - 饱满且占据核心区域 / Bold Cloud Body */}
    <path 
      d="M38 92C23.6 92 12 80.4 12 66C12 52.6 22.1 41.6 35 40.1C40.4 27.3 52.9 18 67.5 18C85.3 18 100.2 30.8 102.7 47.7C112.4 49.7 120 58.2 120 68.5C120 81.5 109.5 92 96.5 92H38Z" 
      fill="white" 
    />
    
    {/* 物联网核心点 - 使用深蓝色对比，线条加粗确保小尺寸可见 / IoT Core - Bold and Clear */}
    <circle cx="66" cy="62" r="16" fill="#2563EB" />
    <circle cx="66" cy="62" r="6" fill="white" />
    
    {/* 连接线条 - 极简且坚实 / Minimalist Connectors */}
    <path d="M66 42V32" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" />
    <path d="M66 82V92" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" />
    <path d="M46 62H36" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" />
    <path d="M96 62H86" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" />

    <defs>
      <linearGradient id="logo-grad-v5" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
    </defs>
  </svg>
);

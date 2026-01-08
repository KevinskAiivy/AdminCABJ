
import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'light' | 'dark' | 'gold' | 'base';
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick, 
  variant = 'light',
  hoverEffect = false,
  style,
  ...props 
}) => {
  const variantClass = {
    base: 'bg-white border border-gray-100 shadow-sm', // Low performance cost fallback
    light: 'liquid-glass',
    dark: 'liquid-glass-dark text-white',
    gold: 'liquid-glass-gold'
  }[variant];

  const interactiveClass = (onClick || hoverEffect) 
    ? 'cursor-pointer hover:translate-y-[-4px] hover:shadow-[0_20px_40px_-5px_rgba(0,59,148,0.15)] active:scale-[0.99]' 
    : '';

  return (
    <div 
      onClick={onClick}
      className={`${variantClass} rounded-2xl transition-all duration-300 ${interactiveClass} ${className}`}
      style={{ willChange: (onClick || hoverEffect) ? 'transform, box-shadow' : 'auto', ...style }}
      {...props}
    >
      {children}
    </div>
  );
};

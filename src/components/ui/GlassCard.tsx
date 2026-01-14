import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = false,
  ...props 
}) => {
  return (
    <div 
      className={`
        bg-glass-surface 
        backdrop-blur-glass 
        border border-glass-border 
        rounded-xl 
        p-6 
        text-white
        ${hoverEffect ? 'transition-all duration-300 hover:bg-[rgba(255,255,255,0.08)] hover:scale-[1.01]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

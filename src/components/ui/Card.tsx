import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const baseClasses = 'rounded-xl p-4 sm:p-6 transition-all duration-300';
  const themeClasses = 'bg-[var(--color-elevated)] shadow-[var(--shadow-md)] border border-[var(--color-border)]';
  const hoverClass = hover ? 'card-hover cursor-pointer hover:shadow-[var(--shadow-lg)] hover:scale-[1.02]' : '';
  const clickableClass = onClick ? 'cursor-pointer active:shadow-sm active:scale-[0.98]' : '';
  
  return (
    <div
      className={`${baseClasses} ${themeClasses} ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
      style={{
        boxShadow: 'var(--shadow-md)',
        borderColor: 'var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}


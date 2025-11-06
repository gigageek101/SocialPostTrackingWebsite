import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const baseClasses = 'glass-effect rounded-2xl shadow-luxury p-6 sm:p-8 border border-mandarin/10 animate-scale-in';
  const hoverClass = hover ? 'card-hover cursor-pointer hover:border-mandarin/30 hover:shadow-glow-mandarin' : '';
  const clickableClass = onClick ? 'cursor-pointer active:shadow-md active:scale-[0.97]' : '';
  
  return (
    <div
      className={`${baseClasses} ${hoverClass} ${clickableClass} ${className} luxury-transition`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}


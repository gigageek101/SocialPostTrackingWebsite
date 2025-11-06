import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const baseClasses = 'bg-white rounded-xl shadow-md p-4 sm:p-6';
  const hoverClass = hover ? 'card-hover cursor-pointer' : '';
  const clickableClass = onClick ? 'cursor-pointer active:shadow-sm active:scale-[0.98]' : '';
  
  return (
    <div
      className={`${baseClasses} ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}


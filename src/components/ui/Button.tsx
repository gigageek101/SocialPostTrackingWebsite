import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'transition-all duration-300 font-semibold rounded-lg focus-ring disabled:opacity-50 disabled:cursor-not-allowed touch-target active:scale-95';
  
  const variantClasses = {
    primary: 'bg-[var(--color-orange)] hover:bg-[var(--color-orange-dark)] active:bg-[var(--color-orange-dark)] text-white shadow-md active:shadow-sm',
    secondary: 'border-2 border-[var(--color-border)] hover:border-[var(--color-orange)] active:border-[var(--color-orange)]',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md active:shadow-sm',
    ghost: 'bg-transparent hover:bg-[var(--color-surface)] active:bg-[var(--color-surface)]',
  };
  
  const variantTextClasses = {
    primary: '',
    secondary: 'text-[var(--color-text-primary)]',
    danger: '',
    ghost: 'text-[var(--color-text-secondary)] hover:text-[var(--color-orange)]',
  };
  
  // Larger touch targets on mobile
  const sizeClasses = {
    sm: 'px-4 py-2.5 text-sm min-h-[44px]',
    md: 'px-5 py-3 text-base min-h-[48px]',
    lg: 'px-6 py-4 text-lg min-h-[56px]',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${variantTextClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}


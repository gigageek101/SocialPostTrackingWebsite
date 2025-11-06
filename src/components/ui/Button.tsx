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
  const baseClasses = 'smooth-transition font-medium rounded-lg focus-ring disabled:opacity-50 disabled:cursor-not-allowed touch-target active:scale-95';
  
  const variantClasses = {
    primary: 'bg-blue-600 active:bg-blue-800 text-white shadow-md active:shadow-sm',
    secondary: 'bg-gray-200 active:bg-gray-400 text-gray-900',
    danger: 'bg-red-600 active:bg-red-800 text-white shadow-md active:shadow-sm',
    ghost: 'bg-transparent active:bg-gray-200 text-gray-700',
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
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}


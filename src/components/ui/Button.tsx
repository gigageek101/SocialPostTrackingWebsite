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
  const baseClasses = 'luxury-transition font-semibold rounded-xl focus-ring disabled:opacity-50 disabled:cursor-not-allowed touch-target active:scale-95 border-2';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-mandarin to-mandarin-light hover:from-mandarin-light hover:to-gold text-white shadow-glow-mandarin hover:shadow-glow-gold border-mandarin/50',
    secondary: 'bg-dark-elevated hover:bg-dark-surface text-gray-300 border-mandarin/20 hover:border-mandarin/40',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-md border-red-500/50',
    ghost: 'bg-transparent hover:bg-dark-elevated text-mandarin border-transparent hover:border-mandarin/30',
  };
  
  // Larger touch targets on mobile
  const sizeClasses = {
    sm: 'px-5 py-3 text-sm min-h-[44px]',
    md: 'px-6 py-3.5 text-base min-h-[48px] font-bold',
    lg: 'px-8 py-5 text-lg min-h-[56px] font-bold',
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


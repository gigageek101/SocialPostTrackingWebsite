import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 smooth-transition"
        onClick={onClose}
      />
      
      {/* Modal - Full screen on mobile, centered on desktop */}
      <div
        className={`relative bg-white sm:rounded-xl shadow-2xl ${sizeClasses[size]} w-full 
        h-full sm:h-auto sm:max-h-[90vh] overflow-hidden 
        animate-slide-in sm:animate-scale-in rounded-t-3xl sm:rounded-t-xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 active:text-gray-800 smooth-transition focus-ring rounded p-2 touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content - Full height on mobile with safe area */}
        <div className="p-4 sm:p-6 overflow-y-auto h-[calc(100vh-80px)] sm:h-auto sm:max-h-[calc(90vh-80px)] pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}


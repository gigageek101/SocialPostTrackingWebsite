import { Platform } from '../../types';

interface PlatformIconProps {
  platform: Platform;
  className?: string;
}

export function PlatformIcon({ platform, className = 'w-5 h-5' }: PlatformIconProps) {
  const iconPaths = {
    tiktok: '/icons/tiktok.png',
    threads: '/icons/threads.png',
    instagram: '/icons/instagram.png',
    facebook: '/icons/facebook.png',
  };
  
  return (
    <img 
      src={iconPaths[platform]} 
      alt={platform}
      className={className}
    />
  );
}


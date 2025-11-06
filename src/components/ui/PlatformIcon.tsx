import { Video, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { Platform } from '../../types';

interface PlatformIconProps {
  platform: Platform;
  className?: string;
}

export function PlatformIcon({ platform, className = 'w-5 h-5' }: PlatformIconProps) {
  const icons = {
    tiktok: <Video className={className} />,
    threads: <MessageCircle className={className} />,
    instagram: <Instagram className={className} />,
    facebook: <Facebook className={className} />,
  };
  
  return icons[platform] || null;
}


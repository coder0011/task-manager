import React, { useState } from 'react';
import { formatUserInitials } from '../lib/formatters';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarColor = 'blue' | 'purple' | 'amber' | 'emerald' | 'zinc';

export interface UserAvatarProps {
  ref?: React.Ref<any>;
  name?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  color?: AvatarColor;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
}

const sizeClasses: Record<AvatarSize, { container: string; text: string; ring: string }> = {
  xs: { container: 'w-4 h-4', text: 'text-[8px]', ring: 'ring-1' },
  sm: { container: 'w-5 h-5', text: 'text-[9px]', ring: 'ring-1' },
  md: { container: 'w-7 h-7', text: 'text-xs', ring: 'ring-1' },
  lg: { container: 'w-9 h-9', text: 'text-sm font-semibold', ring: 'ring-2' },
  xl: { container: 'w-12 h-12', text: 'text-base font-bold', ring: 'ring-2' },
};

const colorClasses: Record<AvatarColor, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-600/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-600/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  amber: { bg: 'bg-amber-600/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  emerald: { bg: 'bg-emerald-600/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  zinc: { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  ref,
  name,
  avatarUrl,
  size = 'sm',
  color = 'blue',
  onClick,
  className = '',
  title,
}) => {
  const [hasImageError, setHasImageError] = useState(false);
  const sizeConfig = sizeClasses[size] || sizeClasses.sm;
  const colorConfig = colorClasses[color] || colorClasses.blue;
  const initials = formatUserInitials(name, 1);
  const effectiveTitle = title ?? (name ? name : 'User');

  const avatarContent = avatarUrl && !hasImageError ? (
    <img
      src={avatarUrl}
      alt={name || 'Avatar'}
      onError={() => setHasImageError(true)}
      className={`${sizeConfig.container} rounded-full object-cover border border-[#27272a] shrink-0`}
    />
  ) : (
    <div
      className={`${sizeConfig.container} rounded-full ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border} border flex items-center justify-center font-bold shrink-0 ${sizeConfig.text}`}
    >
      {initials}
    </div>
  );

  if (onClick) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        title={effectiveTitle}
        aria-label={effectiveTitle}
        className={`inline-flex rounded-full transition-transform active:scale-95 hover:ring-2 hover:ring-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer ${className}`}
      >
        {avatarContent}
      </button>
    );
  }

  return (
    <div ref={ref} title={effectiveTitle} className={`inline-flex shrink-0 ${className}`}>
      {avatarContent}
    </div>
  );
};

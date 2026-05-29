'use client';

import Image from 'next/image';

interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({
  firstName = '',
  lastName = '',
  avatar,
  size = 36,
  className = '',
}: UserAvatarProps) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';

  const style: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    fontSize: size * 0.38,
    borderRadius: '50%',
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${firstName} ${lastName}`}
        style={style}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`bg-brand-500/[0.12] text-brand-600 ring-1 ring-brand-500/20 flex items-center justify-center font-bold select-none ${className}`}
    >
      {initials}
    </div>
  );
}

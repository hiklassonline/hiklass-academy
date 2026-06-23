import React, { useState, useEffect } from 'react';
import getAssetUrl from '../../utils/getAssetUrl';

export default function AdminAvatar({ user, size = 36, className = '', style: extraStyle }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = user?.avatarUrl || '';
  const name = user?.name || 'Admin';
  const initial = name.charAt(0).toUpperCase();

  useEffect(() => { setImgError(false); }, [avatarUrl]);

  if (avatarUrl && !imgError) {
    const src = getAssetUrl(avatarUrl);
    return (
      <span
        className={`adminAvatarWrapper ${className}`}
        style={{ width: size, height: size, minWidth: size, ...extraStyle }}
      >
        <img
          key={avatarUrl}
          src={src}
          alt={name}
          className="adminAvatarImg"
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`adminAvatarFallback ${className}`}
      style={{ width: size, height: size, minWidth: size, fontSize: size * 0.4, ...extraStyle }}
    >
      {initial}
    </span>
  );
}

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { CoverConfig } from '../types';

interface BookCoverPreviewProps {
  title: string;
  subtitle?: string;
  authorName: string;
  coverImageUrl?: string | null;
  coverConfig?: Partial<CoverConfig>;
  className?: string;
  compact?: boolean;
}

export const BookCoverPreview: React.FC<BookCoverPreviewProps> = ({
  title,
  subtitle,
  authorName,
  coverImageUrl,
  coverConfig,
  className = '',
  compact = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const bg = coverConfig?.backgroundColor || '#0F172A';
  const accent = coverConfig?.accentColor || '#D97706';
  const text = coverConfig?.textColor || '#FFFFFF';
  const align = coverConfig?.titleAlign === 'center' ? 'text-center items-center' : 'text-left items-start';
  const fontClass =
    coverConfig?.fontFamily === 'serif'
      ? 'font-serif'
      : coverConfig?.fontFamily === 'mono'
        ? 'font-mono'
        : 'font-display';
  const overlayOpacity = coverConfig?.overlayOpacity ?? 0.45;

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm select-none ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {coverImageUrl && !imgFailed ? (
        <img
          src={coverImageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-15"
          style={{
            background: `radial-gradient(circle at 25% 20%, ${accent}, transparent 60%)`,
          }}
        >
          <BookOpen className="h-16 w-16" />
        </div>
      )}

      {/* Measured contrast scrim */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(15,23,42,${Math.min(0.85, overlayOpacity + 0.1)}) 0%, rgba(15,23,42,${Math.max(0.25, overlayOpacity * 0.65)}) 50%, rgba(15,23,42,${Math.min(0.9, overlayOpacity + 0.28)}) 100%)`,
        }}
      />

      <div className={`relative z-10 flex h-full flex-col justify-between ${compact ? 'p-3.5' : 'p-5'} ${align}`}>
        <div className="w-full">
          {coverConfig?.badgeText && !compact && (
            <div
              className="mb-2.5 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: accent }}
            >
              {coverConfig.badgeText}
            </div>
          )}
          <h3
            className={`${fontClass} font-bold leading-tight tracking-tight line-clamp-3 ${
              compact ? 'text-sm' : 'text-lg sm:text-xl'
            }`}
          >
            {title || 'Sans titre'}
          </h3>
          {subtitle && coverConfig?.showSubtitle !== false && !compact && (
            <p className="mt-2 text-xs leading-snug opacity-85 line-clamp-2">{subtitle}</p>
          )}
        </div>

        {coverConfig?.showAuthor !== false && (
          <div className="w-full pt-3">
            <div className="mb-2 h-0.5 w-8" style={{ backgroundColor: accent }} />
            <div className={`font-medium truncate opacity-95 ${compact ? 'text-[11px]' : 'text-xs'}`}>
              {authorName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

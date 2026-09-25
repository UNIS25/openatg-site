'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { adjacentView, collectionCopy, packagingImage, packagingSrcSet } from '@/lib/collection-copy';
import type { Locale } from '@/lib/types';

export default function PackagingGallery({ locale }: { locale: Locale }) {
  const [view, setView] = useState<0 | 1>(0);
  const c = collectionCopy[locale];
  const label = view === 0 ? c.closed : c.open;
  return <figure className="collection-gallery" aria-label={c.gallery}>
    <div className="collection-image-stage" id="packaging-views">
      {(['closed', 'open'] as const).map((name, index) => <img
        key={name} src={packagingImage(name)} srcSet={packagingSrcSet(name)}
        sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1100px) 56vw, 850px"
        width="1536" height="1024" alt={name === 'closed' ? c.closedAlt : c.openAlt}
        className={view === index ? 'is-visible' : ''}
        aria-hidden={view !== index} fetchPriority={index === 0 ? 'high' : 'auto'}
      />)}
    </div>
    <figcaption className="collection-gallery-controls">
      <div aria-live="polite" aria-atomic="true"><span className="collection-view-count">{c.view} {view + 1} / 2</span><span>{label}</span></div>
      <div className="collection-arrows">
        <button type="button" aria-label={c.previous} aria-controls="packaging-views" onClick={() => setView(adjacentView(view, -1))}><ArrowLeft size={20} aria-hidden="true" /></button>
        <button type="button" aria-label={c.next} aria-controls="packaging-views" onClick={() => setView(adjacentView(view, 1))}><ArrowRight size={20} aria-hidden="true" /></button>
      </div>
    </figcaption>
  </figure>;
}

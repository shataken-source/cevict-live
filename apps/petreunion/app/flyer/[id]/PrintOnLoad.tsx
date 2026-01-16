'use client';

import { useEffect, useRef } from 'react';

export default function PrintOnLoad({ delayMs = 250 }: { delayMs?: number }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const waitForImages = async () => {
      const imgs = Array.from(document.images || []);
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) return resolve();
              const done = () => resolve();
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            })
        )
      );
      await new Promise((r) => setTimeout(r, delayMs));
      window.print();
    };

    waitForImages();
  }, [delayMs]);

  return null;
}


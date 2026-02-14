'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fallbackSrc?: string;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  fallbackSrc,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 75,
  placeholder = 'empty',
  blurDataURL
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate WebP version of the image
  const getWebPSrc = (originalSrc: string): string => {
    // If it's already a WebP or external URL, return as-is
    if (originalSrc.includes('.webp') || originalSrc.startsWith('http')) {
      return originalSrc;
    }
    
    // Convert to WebP format
    const lastDotIndex = originalSrc.lastIndexOf('.');
    if (lastDotIndex === -1) return originalSrc;
    
    const base = originalSrc.substring(0, lastDotIndex);
    return `${base}.webp`;
  };

  const webpSrc = getWebPSrc(src);
  const finalFallbackSrc = fallbackSrc || src;

  useEffect(() => {
    // Preload the WebP image to check if it loads
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
    };
    img.onerror = () => {
      setError(true);
      setIsLoading(false);
    };
    img.src = webpSrc;
  }, [webpSrc]);

  // Generate blur placeholder for better loading experience
  const generateBlurDataURL = (w: number, h: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, w, h);
    }
    return canvas.toDataURL();
  };

  const blurData = blurDataURL || (width && height ? generateBlurDataURL(width, height) : undefined);

  if (error) {
    // Fallback to original image or error state
    return (
      <div className={`relative ${className}`}>
        {width && height ? (
          <Image
            src={finalFallbackSrc}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            sizes={sizes}
            quality={quality}
            placeholder={placeholder}
            blurDataURL={blurData}
            className="object-cover"
          />
        ) : (
          <img
            src={finalFallbackSrc}
            alt={alt}
            className={`object-cover ${className}`}
            loading={priority ? 'eager' : 'lazy'}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      
      {width && height ? (
        <Image
          ref={imgRef}
          src={webpSrc}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={sizes}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurData}
          className={`object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onError={() => setError(true)}
        />
      ) : (
        <img
          ref={imgRef}
          src={webpSrc}
          alt={alt}
          className={`object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${className}`}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// Picture component for responsive images with multiple formats
export function ResponsiveImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={src}
          alt={alt}
          className="object-cover w-full h-full"
          loading={priority ? 'eager' : 'lazy'}
        />
      </div>
    );
  }

  return (
    <picture className={className}>
      {/* WebP sources */}
      <source
        srcSet={`
          ${src.replace(/\.(jpg|jpeg|png)$/i, '.webp')} 1x,
          ${src.replace(/\.(jpg|jpeg|png)$/i, '@2x.webp')} 2x
        `}
        type="image/webp"
        sizes={sizes}
      />
      
      {/* AVIF sources for even better compression */}
      <source
        srcSet={`
          ${src.replace(/\.(jpg|jpeg|png)$/i, '.avif')} 1x,
          ${src.replace(/\.(jpg|jpeg|png)$/i, '@2x.avif')} 2x
        `}
        type="image/avif"
        sizes={sizes}
      />
      
      {/* Fallback to original format */}
      <img
        src={src}
        alt={alt}
        className="object-cover w-full h-full"
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setError(true)}
      />
    </picture>
  );
}

// Lazy loading image component for below-the-fold content
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  threshold = 0.1
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  threshold?: number;
}) {
  const [isInView, setIsInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isInView && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      
      {isInView && (
        <OptimizedImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-500 ${
            hasLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setHasLoaded(true)}
        />
      )}
    </div>
  );
}

// Preload critical images
export function preloadImages(srcs: string[]): void {
  srcs.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    document.head.appendChild(link);
  });
}

import React, { useState, useEffect } from 'react';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

/**
 * Performant Image component with lazy loading, asynchronous decoding,
 * CSS skeleton placeholder, and automatic CDN optimizations.
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  quality = 80,
  fallback = null,
  style = {},
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');

  useEffect(() => {
    setLoaded(false);
    setError(false);
    if (src) {
      const optimized = getOptimizedImageUrl(src, { width, quality });
      setCurrentSrc(optimized);
    } else {
      setError(true);
    }
  }, [src, width, quality]);

  const handleImageError = () => {
    if (!error) {
      setError(true);
      if (fallback) {
        setCurrentSrc(fallback);
      }
    }
  };

  // Detect explicit width/height sizing in the Tailwind/Vanilla classes
  const classesList = className.split(' ');
  const hasWidthClass = classesList.some(c => c.startsWith('w-') && c !== 'w-auto');
  const hasHeightClass = classesList.some(c => c.startsWith('h-') && c !== 'h-auto');
  const isBlock = className.includes('block') && !className.includes('inline-block');

  // Wrapper style - positioning and layouts should live on the wrapper
  const containerStyle = {
    position: 'relative',
    display: isBlock ? 'block' : 'inline-block',
    // Apply overflow: hidden only when loading to clip the skeleton to border-radius.
    // Once loaded, set to visible so drop shadows and animations do not get clipped!
    overflow: loaded ? 'visible' : 'hidden',
    ...style, // merge inline styles passed from user
  };

  // Inner image style - scales to fill container while honoring sizes & fit
  const imgStyle = {
    display: 'block',
    width: hasWidthClass ? '100%' : 'auto',
    height: hasHeightClass ? '100%' : 'auto',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: className.includes('object-cover') ? 'cover' : (className.includes('object-fill') ? 'fill' : 'contain'),
    opacity: loaded ? 1 : 0,
    transition: 'opacity 0.4s ease-in-out',
    animation: 'inherit', // inherit parent float or pulse animation if applicable
  };

  const skeletonStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    animation: 'pulse-bg 1.8s infinite ease-in-out',
    borderRadius: style.borderRadius || 'inherit',
    zIndex: 1
  };

  return (
    <div className={`optimized-image-wrapper ${className}`} style={containerStyle}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-bg {
          0% { background-color: #f1f5f9; }
          50% { background-color: #e2e8f0; }
          100% { background-color: #f1f5f9; }
        }
      `}} />
      
      {!loaded && !error && (
        <div className="image-skeleton-loader" style={skeletonStyle} />
      )}
      
      {error && !fallback ? (
        <div style={{
          ...skeletonStyle,
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '11px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '16px', marginBottom: '2px' }}>📷</span>
          <span>Not Available</span>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setLoaded(true)}
          onError={handleImageError}
          style={imgStyle}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

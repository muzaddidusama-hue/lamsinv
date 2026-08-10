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

  // Styling helpers
  const skeletonStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    animation: 'pulse-bg 1.8s infinite ease-in-out',
    borderRadius: 'inherit',
    zIndex: 1
  };

  const containerStyle = {
    position: 'relative',
    display: 'inline-block',
    overflow: 'hidden',
    width: width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
    height: height ? (typeof height === 'number' ? `${height}px` : height) : '100%',
    ...style
  };

  const imgStyle = {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    opacity: loaded ? 1 : 0,
    transition: 'opacity 0.4s ease-in-out',
    zIndex: 2,
    position: 'relative'
  };

  return (
    <div className={`optimized-image-container ${className}`} style={containerStyle}>
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

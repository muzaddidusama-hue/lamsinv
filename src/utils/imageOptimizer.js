/**
 * Optimizes external image URLs (Supabase, Unsplash) dynamically.
 * Falls back to the original URL if it's not a supported CDN.
 * 
 * @param {string} url - The original image URL
 * @param {object} options - Optimization options
 * @param {number} [options.width] - Desired width of the image
 * @param {number} [options.quality=80] - Desired compression quality (1-100)
 * @returns {string} The optimized image URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url;

  const { width, quality = 80 } = options;

  // 1. Handle Supabase Storage URLs
  // Check if it's a Supabase storage URL: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const supabaseRegex = /https:\/\/(.+?)\.supabase\.co\/storage\/v1\/object\/public\/(.+)/;
  const isSupabase = supabaseRegex.test(url);

  if (isSupabase) {
    // Check if image transformation is bypassed or enabled
    const bypassTransform = import.meta.env.VITE_BYPASS_IMAGE_TRANSFORM === 'true';
    if (bypassTransform) {
      return url;
    }
    
    // Rewrite /object/public/ to /render/image/public/
    const renderedUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    
    const params = [];
    if (width) params.push(`width=${width}`);
    params.push(`quality=${quality}`);
    
    // Add resize parameter if we specify width (standard is contain)
    if (width) params.push('resize=contain');
    
    const queryString = params.join('&');
    return `${renderedUrl}${url.includes('?') ? '&' : '?'}${queryString}`;
  }

  // 2. Handle Unsplash URLs
  if (url.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(url);
      if (width) urlObj.searchParams.set('w', width.toString());
      urlObj.searchParams.set('q', quality.toString());
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fm', 'webp');
      urlObj.searchParams.set('fit', 'crop');
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }

  // 3. Fallback to original URL for local assets, postimg, etc.
  return url;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaHl0Y3Jtc3Rsa3ZubXdmeGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTA5MDYsImV4cCI6MjA5MjE2NjkwNn0.ipaXOyv2mGTZMPJrqqkFVu_qnNhvWlm9-PZJqxu2XUw';

// Client-side cache memory stores
const memoryCache = new Map();
const CLIENT_CACHE_TTL = 120000; // 2 minutes in milliseconds

/**
 * Custom fetch implementation that handles client-side caching (in-memory & LocalStorage)
 * and optional server-side Redis caching proxy routing.
 */
async function customCachingFetch(url, options = {}) {
  const method = options.method || 'GET';
  const isGet = method.toUpperCase() === 'GET';
  const isRest = url.includes('/rest/v1/');

  // 1. Intercept read operations (SELECT / GET)
  if (isGet && isRest) {
    const useRedis = import.meta.env.VITE_USE_REDIS === 'true';
    const cacheKey = `sb-cache:${url}`;

    // A. Check Client-Side Caching (Cache Memory)
    // First check in-memory Map
    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
        console.log(`[Cache Memory Hit (In-Memory)]: ${url}`);
        return new Response(JSON.stringify(cached.data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } else {
        memoryCache.delete(cacheKey);
      }
    }

    // Next check LocalStorage
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < CLIENT_CACHE_TTL) {
          console.log(`[Cache Memory Hit (LocalStorage)]: ${url}`);
          // Hydrate in-memory cache
          memoryCache.set(cacheKey, { data, timestamp });
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.warn('LocalStorage read/parse error in cache check:', e);
    }

    // B. Route request (either via Redis Proxy or direct Supabase)
    let fetchUrl = url;
    let fetchOptions = { ...options };

    if (useRedis) {
      // Direct request to the local Express backend proxy
      console.log(`[Redis Proxy Fetch]: Routing query via cache server for URL: ${url}`);
      fetchUrl = `/api/query?url=${encodeURIComponent(url)}`;
      // Remove supabase auth headers since the backend proxy handles backend auth/request safely
      if (fetchOptions.headers) {
        const newHeaders = { ...fetchOptions.headers };
        delete newHeaders['apikey'];
        delete newHeaders['Authorization'];
        fetchOptions.headers = newHeaders;
      }
    }

    const response = await fetch(fetchUrl, fetchOptions);

    if (response.ok) {
      try {
        const clone = response.clone();
        const data = await clone.json();

        // Save to in-memory & LocalStorage cache
        const cacheEntry = { data, timestamp: Date.now() };
        memoryCache.set(cacheKey, cacheEntry);
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch (e) {
        console.warn('Failed to parse or write to cache:', e);
      }
    }

    return response;
  }

  // 2. Intercept write operations (POST, PATCH, PUT, DELETE) to invalidate cache
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
    // Extract table name from rest/v1/tableName
    const match = url.match(/\/rest\/v1\/([^?\/]+)/);
    if (match) {
      const tableName = match[1];
      console.log(`[Cache Invalidation]: Write operation detected on table [${tableName}]. Invalidating cache...`);
      
      // Invalidate Client-side In-Memory Cache
      for (const key of memoryCache.keys()) {
        if (key.includes(`/rest/v1/${tableName}`)) {
          memoryCache.delete(key);
        }
      }

      // Invalidate Client-side LocalStorage Cache
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-cache:') && key.includes(`/rest/v1/${tableName}`)) {
            localStorage.removeItem(key);
            i--; // Offset decrement since item is removed
          }
        }
      } catch (e) {
        console.warn('LocalStorage invalidation error:', e);
      }

      // Invalidate Server-side Redis Cache (if enabled)
      const useRedis = import.meta.env.VITE_USE_REDIS === 'true';
      if (useRedis) {
        console.log(`[Redis Invalidation]: Requesting Redis key purge for table [${tableName}]`);
        fetch(`/api/invalidate?table=${tableName}`, { method: 'POST' }).catch(err => {
          console.error('[Redis Invalidation Error]:', err);
        });
      }
    }
  }

  return fetch(url, options);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customCachingFetch
  }
});
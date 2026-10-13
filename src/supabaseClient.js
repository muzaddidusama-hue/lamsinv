import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaHl0Y3Jtc3Rsa3ZubXdmeGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTA5MDYsImV4cCI6MjA5MjE2NjkwNn0.ipaXOyv2mGTZMPJrqqkFVu_qnNhvWlm9-PZJqxu2XUw';

// Client-side cache memory stores (only for quasi-static settings)
const memoryCache = new Map();
const STATIC_CACHE_TTL = 30000; // 30 seconds for static metadata only

// Tables that must ALWAYS be fresh and NEVER cached with stale data
const UNCACHED_TABLES = ['chalans', 'chalan_items', 'products', 'ledger', 'stock_out', 'inv_sl', 'customers', 'Broken'];

// Helper to completely purge client-side cache
export function clearSupabaseCache() {
  memoryCache.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-cache:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Purge any existing stale cache from previous sessions on boot
clearSupabaseCache();

/**
 * Custom fetch implementation that prevents stale reads on operational/transactional data
 * while avoiding memory leaks and race conditions.
 */
async function customCachingFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const isRest = url.includes('/rest/v1/');

  // Check if target table is a mutable transactional table
  const match = url.match(/\/rest\/v1\/([^?\/]+)/);
  const targetTable = match ? match[1] : '';
  const isDynamicTable = UNCACHED_TABLES.includes(targetTable) || targetTable.startsWith('rpc');

  // 1. Intercept read operations (SELECT / GET) only for static tables
  if (isGet && isRest && !isDynamicTable) {
    const cacheKey = `sb-cache:${url}`;

    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < STATIC_CACHE_TTL) {
        return new Response(JSON.stringify(cached.data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } else {
        memoryCache.delete(cacheKey);
      }
    }

    const response = await fetch(url, options);

    if (response.ok) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      } catch (e) {
        // Ignore json clone errors
      }
    }

    return response;
  }

  // 2. Intercept write operations (POST, PATCH, PUT, DELETE) to instantly invalidate caches
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    clearSupabaseCache();

    // Invalidate Server-side Redis Cache if active
    const useRedis = import.meta.env.VITE_USE_REDIS === 'true';
    if (useRedis && targetTable) {
      fetch(`/api/invalidate?table=${targetTable}`, { method: 'POST' }).catch(() => {});
    }
  }

  return fetch(url, options);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customCachingFetch
  }
});
import express from 'express';

export const router = express.Router();

/**
 * In-memory API Route Switch Registry
 * Allows dynamic runtime enabling/disabling of individual endpoints.
 */
const apiRegistry = {
  notify_all: {
    id: 'notify_all',
    name: 'Unified Notification Broadcast',
    path: '/api/notify',
    method: 'POST',
    enabled: true,
    requestsCount: 0,
    blockedCount: 0
  },
  notify_telegram: {
    id: 'notify_telegram',
    name: 'Telegram Bot API',
    path: '/api/notify/telegram',
    method: 'POST',
    enabled: true,
    requestsCount: 0,
    blockedCount: 0
  },
  notify_whatsapp: {
    id: 'notify_whatsapp',
    name: 'Meta WhatsApp Cloud API',
    path: '/api/notify/whatsapp',
    method: 'POST',
    enabled: true,
    requestsCount: 0,
    blockedCount: 0
  },
  query_cache: {
    id: 'query_cache',
    name: 'Redis Cache Proxy Query',
    path: '/api/query',
    method: 'GET',
    enabled: true,
    requestsCount: 0,
    blockedCount: 0
  },
  cache_invalidate: {
    id: 'cache_invalidate',
    name: 'Cache Invalidation Purger',
    path: '/api/invalidate',
    method: 'POST',
    enabled: true,
    requestsCount: 0,
    blockedCount: 0
  },
  telegram_stock: {
    id: 'telegram_stock',
    name: 'Telegram Live Stock Report',
    path: '/api/telegram/stock',
    method: 'ALL',
    enabled: true,
    requestsCount: 0,
    blockedCount: 0
  }
};

/**
 * Gatekeeper Middleware
 * Intercepts incoming requests and verifies whether the targeted endpoint is active.
 */
export function apiGatekeeper(req, res, next) {
  const reqPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
  const normalizedPath = reqPath.replace(/\/$/, ''); // Remove trailing slash
  const reqMethod = req.method.toUpperCase();

  // Find matching endpoint in registry
  const matchedEntry = Object.values(apiRegistry).find((entry) => {
    const methodMatches = entry.method === 'ALL' || entry.method === reqMethod;
    return methodMatches && normalizedPath === entry.path;
  });

  if (matchedEntry) {
    if (!matchedEntry.enabled) {
      matchedEntry.blockedCount += 1;
      return res.status(503).json({
        success: false,
        error: `The API endpoint [${matchedEntry.name}] (${matchedEntry.path}) is currently disabled by administrator.`,
        code: 'API_DISABLED',
        endpoint: matchedEntry.path
      });
    }
    matchedEntry.requestsCount += 1;
  }

  next();
}

/**
 * GET /api/control/status
 * Returns current status of all controlled APIs
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    registry: apiRegistry,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/control/toggle
 * Dynamically enable or disable a specific API endpoint
 * Payload: { apiId: 'notify_whatsapp', enabled: false }
 */
router.post('/toggle', (req, res) => {
  const { apiId, enabled } = req.body;

  if (!apiId || typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: "apiId" (string) and "enabled" (boolean) are required.'
    });
  }

  const endpoint = apiRegistry[apiId];
  if (!endpoint) {
    return res.status(404).json({
      success: false,
      error: `API with ID "${apiId}" not found in registry.`
    });
  }

  endpoint.enabled = enabled;
  console.log(`[API Controller]: Endpoint [${endpoint.name}] (${endpoint.path}) is now ${enabled ? 'ENABLED' : 'DISABLED'}`);

  return res.json({
    success: true,
    message: `API [${endpoint.name}] has been ${enabled ? 'enabled' : 'disabled'}.`,
    endpoint
  });
});

/**
 * POST /api/control/toggle-all
 * Bulk enable or disable all endpoints
 * Payload: { enabled: false }
 */
router.post('/toggle-all', (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: '"enabled" (boolean) is required.'
    });
  }

  Object.values(apiRegistry).forEach((entry) => {
    entry.enabled = enabled;
  });

  return res.json({
    success: true,
    message: `All APIs have been ${enabled ? 'enabled' : 'disabled'}.`,
    registry: apiRegistry
  });
});

export default router;

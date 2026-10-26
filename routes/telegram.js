import express from 'express';
import { sendTelegram } from './notifications.js';

export const router = express.Router();

const DEFAULT_TG_TOKEN = '8347291592:AAGmt6yvWyIUCss0KeYoQdzF5ZuWWQbzzoU';
const DEFAULT_TG_CHAT_ID = '8657367736';
const DEFAULT_WEBHOOK_SECRET = 'LAMS_InvBot_15963_UbhMuzaddid17';

/**
 * Helper to fetch all inventory products from Supabase REST API
 */
async function fetchProductsFromDb() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
  const apiKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!apiKey) {
    throw new Error('Supabase API key is missing in environment variables.');
  }

  const targetUrl = `${supabaseUrl}/rest/v1/products?select=id,name,model,category,stock_quantity,availability,unit_price,house,volt,watt&order=name.asc,model.asc`;

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch products from Supabase: ${response.status} ${errText}`);
  }

  return await response.json();
}

/**
 * Searches products by query (matching name, model, category, or house)
 */
async function searchProducts(query) {
  const cleanQ = (query || '').trim().toLowerCase();
  if (!cleanQ) return [];

  const allProducts = await fetchProductsFromDb();
  return allProducts.filter((p) => {
    const fullName = `${p.name || ''} ${p.model || ''}`.toLowerCase();
    const category = (p.category || '').toLowerCase();
    const house = (p.house || '').toLowerCase();
    return fullName.includes(cleanQ) || category.includes(cleanQ) || house.includes(cleanQ);
  });
}

/**
 * Builds a formatted HTML report for Telegram
 */
function buildStockTelegramReport({ products, filter = 'low', threshold = 5 }) {
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0);

  const lowStockItems = products.filter(
    (p) => (Number(p.stock_quantity) || 0) <= threshold && (Number(p.stock_quantity) || 0) > 0
  );
  const outOfStockItems = products.filter(
    (p) => (Number(p.stock_quantity) || 0) <= 0
  );
  const healthyStockItems = products.filter(
    (p) => (Number(p.stock_quantity) || 0) > threshold
  );

  const nowFormatted = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  let reportLines = [
    `📦 <b>LAMS POWER - LIVE INVENTORY REPORT</b>`,
    `📅 <i>${nowFormatted}</i>`,
    `────────────────────────`,
    `📊 <b>Stock Overview:</b>`,
    `• Total Models: <b>${totalProducts}</b>`,
    `• Total Units in Stock: <b>${totalStockUnits.toLocaleString()} pcs</b>`,
    `• ⚠️ Low Stock (≤${threshold}): <b>${lowStockItems.length} items</b>`,
    `• 🛑 Out of Stock: <b>${outOfStockItems.length} items</b>`,
    `• 🟢 Healthy Stock: <b>${healthyStockItems.length} items</b>`,
    `────────────────────────`
  ];

  if (filter === 'all') {
    reportLines.push(`📋 <b>ALL INVENTORY PRODUCTS:</b>`);
    products.forEach((p, idx) => {
      const stock = Number(p.stock_quantity) || 0;
      const statusIcon = stock <= 0 ? '🛑' : stock <= threshold ? '⚠️' : '🟢';
      reportLines.push(
        `${idx + 1}. ${statusIcon} <b>${p.name || ''} ${p.model || ''}</b>` +
        `\n   Category: ${p.category || 'N/A'} | Stock: <b>${stock} pcs</b>`
      );
    });
  } else if (filter === 'out') {
    reportLines.push(`🛑 <b>OUT OF STOCK PRODUCTS (0 PCS):</b>`);
    if (outOfStockItems.length === 0) {
      reportLines.push(`<i>No out-of-stock items currently! All models are in stock.</i>`);
    } else {
      outOfStockItems.slice(0, 30).forEach((p, idx) => {
        reportLines.push(
          `${idx + 1}. 🛑 <b>${p.name || ''} ${p.model || ''}</b> (${p.category || 'N/A'})`
        );
      });
      if (outOfStockItems.length > 30) {
        reportLines.push(`<i>...and ${outOfStockItems.length - 30} more out of stock models</i>`);
      }
    }
  } else {
    // Default 'low' filter: shows both low and out of stock items
    reportLines.push(`⚠️ <b>ATTENTION REQUIRED (LOW & OUT OF STOCK):</b>`);

    if (outOfStockItems.length === 0 && lowStockItems.length === 0) {
      reportLines.push(`<i>All products have sufficient stock levels (>${threshold} pcs).</i>`);
    } else {
      if (outOfStockItems.length > 0) {
        reportLines.push(`\n🛑 <b>Out of Stock (${outOfStockItems.length}):</b>`);
        outOfStockItems.slice(0, 20).forEach((p) => {
          reportLines.push(`• <b>${p.name || ''} ${p.model || ''}</b>: 0 pcs (${p.category || 'N/A'})`);
        });
        if (outOfStockItems.length > 20) {
          reportLines.push(`<i>...and ${outOfStockItems.length - 20} more out of stock models</i>`);
        }
      }

      if (lowStockItems.length > 0) {
        reportLines.push(`\n⚠️ <b>Low Stock (≤${threshold} pcs):</b>`);
        lowStockItems.slice(0, 20).forEach((p) => {
          reportLines.push(`• <b>${p.name || ''} ${p.model || ''}</b>: <b>${p.stock_quantity} pcs</b> (${p.category || 'N/A'})`);
        });
        if (lowStockItems.length > 20) {
          reportLines.push(`<i>...and ${lowStockItems.length - 20} more low stock models</i>`);
        }
      }
    }
  }

  reportLines.push(`────────────────────────`);
  reportLines.push(`🏢 <b>LAMS POWER ERP SYSTEM</b>`);
  reportLines.push(`🌐 <i>https://lamspower.pro.bd</i>`);

  return {
    reportText: reportLines.join('\n'),
    summary: {
      total_products: totalProducts,
      total_stock_units: totalStockUnits,
      low_stock_count: lowStockItems.length,
      out_of_stock_count: outOfStockItems.length,
      healthy_stock_count: healthyStockItems.length,
      threshold
    },
    lowStockItems,
    outOfStockItems
  };
}

/**
 * Formats a single product card for Telegram
 */
function formatProductTelegramCard(product) {
  const stock = Number(product.stock_quantity) || 0;
  const statusIcon = stock <= 0 ? '🛑' : stock <= 5 ? '⚠️' : '🟢';
  const priceFormatted = Number(product.unit_price) 
    ? `৳${Number(product.unit_price).toLocaleString('en-BD')}` 
    : 'Call for Price';

  const lines = [
    `⚡ <b>${product.name || ''} ${product.model || ''}</b>`,
    `📂 <i>Category: ${product.category || 'Solar Equipment'}</i>`,
    `────────────────────────`,
    `💰 <b>Price:</b> <b>${priceFormatted}</b>`,
    `📦 <b>Stock:</b> ${statusIcon} <b>${stock} pcs</b> (${product.availability || (stock > 0 ? 'In Stock' : 'Out of Stock')})`,
    product.house ? `📍 <b>Warehouse:</b> ${product.house}` : null,
    product.volt ? `⚡ <b>Volt:</b> ${product.volt}` : null,
    product.watt ? `💡 <b>Watt:</b> ${product.watt}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Main Interactive Reply Keyboard markup for Telegram Bot
 */
const DEFAULT_KEYBOARD = {
  keyboard: [
    [{ text: '📊 Live Stock' }, { text: '⚠️ Low Stock' }],
    [{ text: '🛑 Out of Stock' }, { text: '📁 Categories' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

/**
 * Controller handler for /api/telegram/stock
 */
async function handleStockTelegram(req, res) {
  try {
    const isPost = req.method.toUpperCase() === 'POST';
    const params = isPost ? (req.body || {}) : (req.query || {});

    const filter = params.filter || 'low';
    const threshold = Number(params.threshold) || 5;
    const chatId = params.chatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_TG_CHAT_ID;
    const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TG_TOKEN;
    const shouldSend = params.send !== 'false' && params.send !== false;

    const products = await fetchProductsFromDb();
    const { reportText, summary, lowStockItems, outOfStockItems } = buildStockTelegramReport({
      products,
      filter,
      threshold
    });

    let telegramSent = false;
    let telegramError = null;

    if (shouldSend) {
      if (!token) {
        telegramError = 'TELEGRAM_BOT_TOKEN is not configured. Message generated but not dispatched.';
      } else if (!chatId) {
        telegramError = 'Telegram Chat ID not specified and TELEGRAM_CHAT_ID is not configured.';
      } else {
        try {
          await sendTelegram({
            message: reportText,
            chatId,
            parseMode: 'HTML',
            replyMarkup: DEFAULT_KEYBOARD
          });
          telegramSent = true;
        } catch (tgErr) {
          telegramError = tgErr.message;
          console.error('[Telegram Stock Endpoint Error]:', tgErr.message);
        }
      }
    }

    return res.json({
      success: true,
      endpoint: '/api/telegram/stock',
      telegram_sent: telegramSent,
      telegram_error: telegramError,
      summary,
      report: reportText,
      low_stock_items: lowStockItems,
      out_of_stock_items: outOfStockItems,
      products_count: products.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API /api/telegram/stock Error]:', err.message);
    return res.status(500).json({
      success: false,
      endpoint: '/api/telegram/stock',
      error: err.message
    });
  }
}

/**
 * Controller handler for /api/telegram/search?q=...
 */
async function handleSearchTelegram(req, res) {
  try {
    const q = req.query.q || req.body?.q || '';
    if (!q.trim()) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
    }

    const matches = await searchProducts(q);
    return res.json({
      success: true,
      query: q,
      total_matches: matches.length,
      products: matches
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Telegram Webhook Handler (POST /api/telegram/webhook)
 * Handles incoming Telegram bot messages, commands, and keyboard presses
 */
async function handleTelegramWebhook(req, res) {
  // Telegram expects 200 OK fast
  res.status(200).json({ ok: true });

  try {
    const update = req.body;
    if (!update) return;

    // Optional Secret Token verification
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'] || req.params.secret;
    if (expectedSecret && incomingSecret && incomingSecret !== expectedSecret) {
      console.warn('[Telegram Webhook]: Secret token mismatch, ignoring update.');
      return;
    }

    // Extract message or callback_query
    const message = update.message || update.edited_message;
    if (!message || !message.chat) return;

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const senderName = message.from?.first_name || 'Customer';

    console.log(`[Telegram Webhook]: Received message from ${senderName} (${chatId}): "${text}"`);

    // Command handling
    const lowerText = text.toLowerCase();

    // 1. /start or /help
    if (lowerText === '/start' || lowerText === '/help') {
      const welcomeMsg = [
        `👋 <b>Hello, ${senderName}!</b>`,
        `Welcome to <b>LAMS POWER Inventory Bot</b>.`,
        ``,
        `You can use this bot to check live stock, search product prices, or monitor low-stock inventory in real-time.`,
        ``,
        `📋 <b>Available Commands:</b>`,
        `• <b>📊 Live Stock</b> (or <code>/stock</code>): Overview of current inventory`,
        `• <b>⚠️ Low Stock</b> (or <code>/low</code>): Items with ≤ 5 units remaining`,
        `• <b>🛑 Out of Stock</b> (or <code>/out</code>): Products currently at 0 units`,
        `• <b>📁 Categories</b> (or <code>/categories</code>): Product categories list`,
        `• <b>🔍 Search Product</b>: Type any product name (e.g. <code>SolarOn</code> or <code>3600VA</code>)`,
        ``,
        `<i>Tap any button below to get started!</i>`
      ].join('\n');

      await sendTelegram({
        message: welcomeMsg,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return;
    }

    // 2. /stock or '📊 Live Stock'
    if (lowerText === '/stock' || lowerText.includes('live stock') || lowerText.includes('stock overview')) {
      const products = await fetchProductsFromDb();
      const { reportText } = buildStockTelegramReport({ products, filter: 'low', threshold: 5 });
      await sendTelegram({
        message: reportText,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return;
    }

    // 3. /low or '⚠️ Low Stock'
    if (lowerText === '/low' || lowerText === '/lowstock' || lowerText.includes('low stock')) {
      const products = await fetchProductsFromDb();
      const lowStockItems = products.filter(
        (p) => (Number(p.stock_quantity) || 0) <= 5 && (Number(p.stock_quantity) || 0) > 0
      );

      let msg = `⚠️ <b>LOW STOCK PRODUCTS (≤ 5 Units):</b>\n────────────────────────\n`;
      if (lowStockItems.length === 0) {
        msg += `<i>No low stock products right now. All active models are well stocked!</i>`;
      } else {
        lowStockItems.slice(0, 30).forEach((p, idx) => {
          msg += `${idx + 1}. <b>${p.name || ''} ${p.model || ''}</b>\n   Stock: 🔴 <b>${p.stock_quantity} pcs</b> (${p.category || 'N/A'})\n`;
        });
        if (lowStockItems.length > 30) {
          msg += `<i>...and ${lowStockItems.length - 30} more models</i>\n`;
        }
      }
      msg += `────────────────────────\n🏢 <b>LAMS POWER ERP</b>`;

      await sendTelegram({
        message: msg,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return;
    }

    // 4. /out or '🛑 Out of Stock'
    if (lowerText === '/out' || lowerText.includes('out of stock')) {
      const products = await fetchProductsFromDb();
      const { reportText } = buildStockTelegramReport({ products, filter: 'out' });
      await sendTelegram({
        message: reportText,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return;
    }

    // 5. /categories or '📁 Categories'
    if (lowerText === '/categories' || lowerText.includes('categories')) {
      const products = await fetchProductsFromDb();
      const catMap = {};
      products.forEach((p) => {
        const cat = p.category || 'Uncategorized';
        if (!catMap[cat]) catMap[cat] = { count: 0, stock: 0 };
        catMap[cat].count += 1;
        catMap[cat].stock += Number(p.stock_quantity) || 0;
      });

      let catMsg = `📁 <b>PRODUCT CATEGORIES INVENTORY:</b>\n────────────────────────\n`;
      Object.entries(catMap).forEach(([catName, stats], idx) => {
        catMsg += `${idx + 1}. <b>${catName}</b>\n   Models: <b>${stats.count}</b> | Total Stock: <b>${stats.stock.toLocaleString()} pcs</b>\n`;
      });
      catMsg += `────────────────────────\n<i>Type any category or model name to search!</i>`;

      await sendTelegram({
        message: catMsg,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return;
    }

    // 6. Search query (either `/search query` or natural text search)
    let searchQuery = text;
    if (lowerText.startsWith('/search')) {
      searchQuery = text.replace(/^\/search\s*/i, '');
    }

    if (!searchQuery.trim()) {
      await sendTelegram({
        message: '❓ Please specify a product name to search.\nExample: <code>/search SolarOn</code> or type <code>3600VA</code>',
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return;
    }

    const matches = await searchProducts(searchQuery);

    if (matches.length === 0) {
      await sendTelegram({
        message: `❌ <b>No products found</b> matching "<b>${searchQuery}</b>".\n\n💡 <i>Try searching with a shorter keyword (e.g. <code>SolarOn</code>, <code>Inhenergy</code>, <code>3600</code>, or <code>Panel</code>).</i>`,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return;
    }

    // If 1 to 5 matches, send detailed cards
    const displayMatches = matches.slice(0, 5);
    const cardMessages = displayMatches.map((p) => formatProductTelegramCard(p)).join('\n\n');

    let reply = `🔍 <b>Search Results for "${searchQuery}" (${matches.length} found):</b>\n\n${cardMessages}`;
    if (matches.length > 5) {
      reply += `\n\n<i>...and ${matches.length - 5} more matching models. Please refine your search keyword if needed.</i>`;
    }

    await sendTelegram({
      message: reply,
      chatId,
      parseMode: 'HTML',
      replyMarkup: DEFAULT_KEYBOARD
    });
  } catch (err) {
    console.error('[Telegram Webhook Handler Error]:', err.message);
  }
}

/**
 * Automated Webhook Setup Endpoint
 * GET /api/telegram/setup-webhook
 * Registers this site's webhook with Telegram Bot API in 1 click
 */
async function handleSetupWebhook(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TG_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;
  const host = req.query.host || req.get('host') || 'lamspower.pro.bd';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const webhookUrl = req.query.url || `${protocol}://${host}/api/telegram/webhook`;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured in .env'
    });
  }

  try {
    const tgUrl = `https://api.telegram.org/bot${token}/setWebhook`;
    const payload = {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query']
    };

    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await tgRes.json();
    return res.json({
      success: data.ok,
      telegram_response: data,
      webhook_url: webhookUrl,
      secret_token_configured: !!secret
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Route definitions
router.get('/stock', handleStockTelegram);
router.post('/stock', handleStockTelegram);
router.get('/search', handleSearchTelegram);
router.post('/search', handleSearchTelegram);

// Webhook endpoints (Telegram calls these)
router.post('/webhook', handleTelegramWebhook);
router.post('/webhook/:secret', handleTelegramWebhook);

// Helper endpoint to register webhook with Telegram
router.get('/setup-webhook', handleSetupWebhook);
router.post('/setup-webhook', handleSetupWebhook);

export default router;

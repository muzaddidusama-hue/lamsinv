import express from 'express';
import { sendTelegram } from './notifications.js';

export const router = express.Router();

/**
 * Helper to fetch all inventory products from Supabase REST API
 */
async function fetchProductsFromDb() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
  const apiKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!apiKey) {
    throw new Error('Supabase API key is missing in environment variables.');
  }

  const targetUrl = `${supabaseUrl}/rest/v1/products?select=id,name,model,category,stock_quantity,availability,unit_price,house&order=name.asc,model.asc`;

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
      outOfStockItems.forEach((p, idx) => {
        reportLines.push(
          `${idx + 1}. 🛑 <b>${p.name || ''} ${p.model || ''}</b> (${p.category || 'N/A'})\n   Warehouse: ${p.house || 'Main'}`
        );
      });
    }
  } else {
    // Default 'low' filter: shows both low and out of stock items
    reportLines.push(`⚠️ <b>ATTENTION REQUIRED (LOW & OUT OF STOCK):</b>`);
    
    if (outOfStockItems.length === 0 && lowStockItems.length === 0) {
      reportLines.push(`<i>All products have sufficient stock levels (>${threshold} pcs).</i>`);
    } else {
      if (outOfStockItems.length > 0) {
        reportLines.push(`\n🛑 <b>Out of Stock (${outOfStockItems.length}):</b>`);
        outOfStockItems.slice(0, 25).forEach((p) => {
          reportLines.push(`• <b>${p.name || ''} ${p.model || ''}</b>: 0 pcs (${p.category || 'N/A'})`);
        });
        if (outOfStockItems.length > 25) {
          reportLines.push(`<i>...and ${outOfStockItems.length - 25} more out of stock models</i>`);
        }
      }

      if (lowStockItems.length > 0) {
        reportLines.push(`\n⚠️ <b>Low Stock (≤${threshold} pcs):</b>`);
        lowStockItems.slice(0, 25).forEach((p) => {
          reportLines.push(`• <b>${p.name || ''} ${p.model || ''}</b>: <b>${p.stock_quantity} pcs</b> (${p.category || 'N/A'})`);
        });
        if (lowStockItems.length > 25) {
          reportLines.push(`<i>...and ${lowStockItems.length - 25} more low stock models</i>`);
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
 * Controller handler for /api/telegram/stock
 * Handles both GET and POST requests
 */
async function handleStockTelegram(req, res) {
  try {
    const isPost = req.method.toUpperCase() === 'POST';
    const params = isPost ? (req.body || {}) : (req.query || {});

    const filter = params.filter || 'low'; // 'low' | 'all' | 'out' | 'summary'
    const threshold = Number(params.threshold) || 5;
    const chatId = params.chatId || process.env.TELEGRAM_CHAT_ID;
    
    // Determine whether to send directly to Telegram.
    // By default, if send is not explicitly 'false' and TELEGRAM_BOT_TOKEN exists, we attempt delivery.
    const shouldSend = params.send !== 'false' && params.send !== false;

    // 1. Fetch live stock data from Supabase
    const products = await fetchProductsFromDb();

    // 2. Build formatted Telegram report
    const { reportText, summary, lowStockItems, outOfStockItems } = buildStockTelegramReport({
      products,
      filter,
      threshold
    });

    // 3. Dispatch to Telegram if requested
    let telegramResult = null;
    let telegramSent = false;
    let telegramError = null;

    if (shouldSend) {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        telegramError = 'TELEGRAM_BOT_TOKEN is not configured in .env. Message generated but not dispatched.';
      } else if (!chatId) {
        telegramError = 'Telegram Chat ID not specified and TELEGRAM_CHAT_ID is not configured in .env.';
      } else {
        try {
          telegramResult = await sendTelegram({
            message: reportText,
            chatId,
            parseMode: 'HTML'
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

// Support both GET and POST
router.get('/stock', handleStockTelegram);
router.post('/stock', handleStockTelegram);

export default router;

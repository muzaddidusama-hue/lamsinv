import express from 'express';
import { sendTelegram } from './notifications.js';

export const router = express.Router();

const DEFAULT_TG_TOKEN = '8347291592:AAGmt6yvWyIUCss0KeYoQdzF5ZuWWQbzzoU';
const DEFAULT_TG_CHAT_ID = '8657367736';
const DEFAULT_WEBHOOK_SECRET = 'LAMS_InvBot_15963_UbhMuzaddid17';
const DEFAULT_SUPABASE_URL = 'https://iahytcrmstlkvnmwfxgs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaHl0Y3Jtc3Rsa3ZubXdmeGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTA5MDYsImV4cCI6MjA5MjE2NjkwNn0.ipaXOyv2mGTZMPJrqqkFVu_qnNhvWlm9-PZJqxu2XUw';

const MAX_TG_LEN = 3800; // Telegram limit is 4096, using 3800 for safety margin

/**
 * Interactive Reply Keyboard markup for Telegram Bot
 */
export const DEFAULT_KEYBOARD = {
  keyboard: [
    [{ text: '🏢 Head Office' }, { text: '🏬 Showroom' }],
    [{ text: '📊 Live Stock' }, { text: '⚠️ Low Stock' }],
    [{ text: '🛑 Out of Stock' }, { text: '📁 Categories' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

/**
 * Helper to fetch all inventory products from Supabase REST API
 */
async function fetchProductsFromDb() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (!apiKey) {
    throw new Error('Supabase API key is missing in environment variables.');
  }

  const targetUrl = `${supabaseUrl}/rest/v1/products?select=id,name,model,category,stock_quantity,availability,unit_price,house,volt,watt&order=category.asc,name.asc,model.asc`;

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
 * Generates a clean human-readable product title without repeating brand name
 */
export function getProductTitle(p) {
  const name = (p.name || '').trim();
  const model = (p.model || '').trim();
  if (!name) return model || 'Unnamed Product';
  if (!model) return name;
  if (model.toLowerCase().startsWith(name.toLowerCase())) {
    return model;
  }
  return `${name} ${model}`;
}

/**
 * Splits a long text message into safe chunks conforming to Telegram's 4096 character limit
 */
export function splitIntoTelegramChunks(reportText, title = '') {
  if (reportText.length <= MAX_TG_LEN) {
    return [reportText];
  }

  const lines = reportText.split('\n');
  const chunks = [];
  let currentChunk = '';
  let partNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if ((currentChunk + '\n' + line).length > MAX_TG_LEN) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = title ? `${title} (Part ${++partNumber})\n────────────────────────\n${line}` : line;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Builds formatted Telegram messages for a specific warehouse (Head Office or Showroom)
 * Groups all products by category, showing live stock with status indicators:
 *  🟢 (> 5 pcs)
 *  ⚠️ (1 to 5 pcs)
 *  🛑 (0 pcs)
 * Packs categories cleanly into separate messages under 3600 characters each.
 */
export function buildWarehouseLiveStockMessages(products, houseName) {
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0);
  const inStockCount = products.filter((p) => (Number(p.stock_quantity) || 0) > 0).length;
  const outStockCount = products.filter((p) => (Number(p.stock_quantity) || 0) <= 0).length;
  const lowStockCount = products.filter(
    (p) => (Number(p.stock_quantity) || 0) > 0 && (Number(p.stock_quantity) || 0) <= 5
  ).length;

  const isHead = houseName.toLowerCase().includes('head');
  const icon = isHead ? '🏢' : '🏬';

  const headerBlock = [
    `${icon} <b>${houseName.toUpperCase()} - LIVE STOCK</b>`,
    `────────────────────────`,
    `📊 <b>Summary:</b>`,
    `• Total Models: <b>${products.length}</b> | Total Units: <b>${totalUnits.toLocaleString()} pcs</b>`,
    `• Status: 🟢 <b>${inStockCount}</b> in stock (⚠️ <b>${lowStockCount}</b> low) | 🛑 <b>${outStockCount}</b> out`,
    `────────────────────────`
  ].join('\n');

  // Group products by category
  const categories = {};
  products.forEach((p) => {
    const cat = p.category || 'Other Solar Equipment';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  });

  const catNames = Object.keys(categories).sort();
  const MAX_MSG_LEN = 3600;
  const messages = [];
  let currentMsg = headerBlock;
  let part = 1;

  for (const cat of catNames) {
    const items = categories[cat];
    const catTotalQty = items.reduce((sum, item) => sum + (Number(item.stock_quantity) || 0), 0);
    const catHeader = `📂 <b>${cat.toUpperCase()} (${items.length} models • ${catTotalQty.toLocaleString()} pcs):</b>`;

    // Sort items alphabetically by title
    items.sort((a, b) => getProductTitle(a).localeCompare(getProductTitle(b)));

    const itemLines = items.map((p) => {
      const stock = Number(p.stock_quantity) || 0;
      const statusIcon = stock <= 0 ? '🛑' : stock <= 5 ? '⚠️' : '🟢';
      const title = getProductTitle(p);
      return `• ${statusIcon} <b>${title}</b>: <b>${stock} pcs</b>`;
    });

    const categoryBlock = `${catHeader}\n${itemLines.join('\n')}`;

    if ((currentMsg + '\n\n' + categoryBlock).length <= MAX_MSG_LEN) {
      currentMsg += '\n\n' + categoryBlock;
    } else if (categoryBlock.length <= MAX_MSG_LEN) {
      if (currentMsg.trim()) messages.push(currentMsg.trim());
      part++;
      currentMsg = `${icon} <b>${houseName.toUpperCase()} - LIVE STOCK (Part ${part})</b>\n────────────────────────\n\n${categoryBlock}`;
    } else {
      // Very large category - split line by line
      if (currentMsg.trim()) messages.push(currentMsg.trim());
      part++;
      currentMsg = `${icon} <b>${houseName.toUpperCase()} - LIVE STOCK (Part ${part})</b>\n────────────────────────\n\n${catHeader}`;

      for (const line of itemLines) {
        if ((currentMsg + '\n' + line).length > MAX_MSG_LEN) {
          messages.push(currentMsg.trim());
          part++;
          currentMsg = `${icon} <b>${houseName.toUpperCase()} - LIVE STOCK (Part ${part})</b>\n────────────────────────\n\n${line}`;
        } else {
          currentMsg += '\n' + line;
        }
      }
    }
  }

  if (currentMsg.trim()) {
    currentMsg += `\n────────────────────────\n🏢 <b>LAMS POWER ERP</b> • 🌐 <i>lamspower.pro.bd</i>`;
    messages.push(currentMsg.trim());
  }

  return messages;
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
 * Formats a single product card for Telegram
 */
function formatProductTelegramCard(product) {
  const stock = Number(product.stock_quantity) || 0;
  const statusIcon = stock <= 0 ? '🛑' : stock <= 5 ? '⚠️' : '🟢';
  const priceFormatted = Number(product.unit_price) 
    ? `৳${Number(product.unit_price).toLocaleString('en-BD')}` 
    : 'Call for Price';

  const title = getProductTitle(product);

  const lines = [
    `⚡ <b>${title}</b>`,
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
 * Controller handler for /api/telegram/stock
 * Returns live stock overview and dispatches reports if requested
 */
async function handleStockTelegram(req, res) {
  try {
    const isPost = req.method.toUpperCase() === 'POST';
    const params = isPost ? (req.body || {}) : (req.query || {});

    const warehouse = (params.warehouse || 'all').toLowerCase();
    const chatId = params.chatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_TG_CHAT_ID;
    const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TG_TOKEN;
    const shouldSend = params.send !== 'false' && params.send !== false;

    const products = await fetchProductsFromDb();

    const headOfficeProds = products.filter((p) => (p.house || '').toLowerCase().includes('head'));
    const showroomProds = products.filter((p) => (p.house || '').toLowerCase().includes('showroom'));
    const otherProds = products.filter(
      (p) => !(p.house || '').toLowerCase().includes('head') && !(p.house || '').toLowerCase().includes('showroom')
    );

    let telegramSent = false;
    let telegramError = null;

    if (shouldSend) {
      if (!token) {
        telegramError = 'TELEGRAM_BOT_TOKEN is not configured.';
      } else if (!chatId) {
        telegramError = 'Telegram Chat ID not specified and TELEGRAM_CHAT_ID is not configured.';
      } else {
        try {
          const msgsToSend = [];
          if (warehouse === 'headoffice' || warehouse === 'head') {
            msgsToSend.push(...buildWarehouseLiveStockMessages(headOfficeProds, 'Head Office'));
          } else if (warehouse === 'showroom' || warehouse === 'show') {
            msgsToSend.push(...buildWarehouseLiveStockMessages(showroomProds, 'Showroom'));
          } else {
            // All warehouses
            msgsToSend.push(...buildWarehouseLiveStockMessages(headOfficeProds, 'Head Office'));
            msgsToSend.push(...buildWarehouseLiveStockMessages(showroomProds, 'Showroom'));
            if (otherProds.length > 0) {
              msgsToSend.push(...buildWarehouseLiveStockMessages(otherProds, 'Other Warehouses'));
            }
          }

          for (let i = 0; i < msgsToSend.length; i++) {
            const isLast = i === msgsToSend.length - 1;
            await sendTelegram({
              message: msgsToSend[i],
              chatId,
              parseMode: 'HTML',
              replyMarkup: isLast ? DEFAULT_KEYBOARD : undefined
            });
          }
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
      summary: {
        total_products: products.length,
        total_units: products.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0),
        head_office: {
          models: headOfficeProds.length,
          units: headOfficeProds.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0)
        },
        showroom: {
          models: showroomProds.length,
          units: showroomProds.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0)
        }
      },
      head_office_count: headOfficeProds.length,
      showroom_count: showroomProds.length,
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
 * Handles incoming Telegram bot messages, commands, and interactive keyboard presses
 */
async function handleTelegramWebhook(req, res) {
  try {
    const update = req.body;
    if (!update) {
      return res.status(200).json({ ok: true, notice: 'No update payload' });
    }

    // Optional Secret Token verification
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'] || req.params.secret;
    if (expectedSecret && incomingSecret && incomingSecret !== expectedSecret) {
      console.warn('[Telegram Webhook]: Secret token mismatch, ignoring update.');
      return res.status(200).json({ ok: true, notice: 'Secret mismatch' });
    }

    // Extract message
    const message = update.message || update.edited_message;
    if (!message || !message.chat) {
      return res.status(200).json({ ok: true, notice: 'No message in update' });
    }

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const senderName = message.from?.first_name || 'Customer';

    console.log(`[Telegram Webhook]: Received message from ${senderName} (${chatId}): "${text}"`);

    const lowerText = text.toLowerCase();
    
    // Command normalization: strip bot username suffix e.g. /stock@InventoryLamsPower_bot -> /stock
    const words = text.split(/\s+/);
    const firstWord = words[0] || '';
    const rawCommand = firstWord.split('@')[0].toLowerCase();
    const commandArgs = words.slice(1).join(' ').trim();
    const normalizedText = lowerText.replace(/@\w+/g, '').trim();

    // 1. /start or /help
    if (rawCommand === '/start' || rawCommand === '/help') {
      const welcomeMsg = [
        `👋 <b>Hello, ${senderName}!</b>`,
        `Welcome to <b>LAMS POWER Inventory Bot</b>.`,
        ``,
        `Real-time inventory lookup for <b>Head Office</b> and <b>Showroom</b>.`,
        ``,
        `📋 <b>Available Commands:</b>`,
        `• <b>/stock</b> or <b>/inventory</b> : Full Live Stock of Head Office & Showroom`,
        `• <b>/headoffice</b> : Live Stock of Head Office only`,
        `• <b>/showroom</b> : Live Stock of Showroom only`,
        `• <b>/low</b> : Items with ≤ 5 units remaining`,
        `• <b>/out</b> : Products currently at 0 units`,
        `• <b>/categories</b> : Stock breakdown by category & warehouse`,
        `• <b>/search &lt;model&gt;</b> : Search any product (e.g. <code>SolarOn 3600</code>)`,
        ``,
        `<i>Tap any button below to get started!</i>`
      ].join('\n');

      await sendTelegram({
        message: welcomeMsg,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return res.status(200).json({ ok: true, handled: 'start' });
    }

    // 2. /headoffice or '🏢 Head Office'
    if (
      ['/headoffice', '/head', '/ho'].includes(rawCommand) ||
      normalizedText === '🏢 head office' ||
      normalizedText === 'head office'
    ) {
      const products = await fetchProductsFromDb();
      const headProds = products.filter((p) => (p.house || '').toLowerCase().includes('head'));
      const messages = buildWarehouseLiveStockMessages(headProds, 'Head Office');

      for (let i = 0; i < messages.length; i++) {
        const isLast = i === messages.length - 1;
        await sendTelegram({
          message: messages[i],
          chatId,
          parseMode: 'HTML',
          replyMarkup: isLast ? DEFAULT_KEYBOARD : undefined
        });
      }
      return res.status(200).json({ ok: true, handled: 'headoffice' });
    }

    // 3. /showroom or '🏬 Showroom'
    if (
      ['/showroom', '/show'].includes(rawCommand) ||
      normalizedText === '🏬 showroom' ||
      normalizedText === 'showroom'
    ) {
      const products = await fetchProductsFromDb();
      const showProds = products.filter((p) => (p.house || '').toLowerCase().includes('showroom'));
      const messages = buildWarehouseLiveStockMessages(showProds, 'Showroom');

      for (let i = 0; i < messages.length; i++) {
        const isLast = i === messages.length - 1;
        await sendTelegram({
          message: messages[i],
          chatId,
          parseMode: 'HTML',
          replyMarkup: isLast ? DEFAULT_KEYBOARD : undefined
        });
      }
      return res.status(200).json({ ok: true, handled: 'showroom' });
    }

    // 4. /stock, /inventory, /allstock, or '📊 Live Stock'
    // Shows ALL products of Head Office AND Showroom
    if (
      ['/stock', '/inventory', '/allstock', 'stock', 'inventory'].includes(rawCommand) ||
      normalizedText.includes('live stock') ||
      normalizedText.includes('all live stock') ||
      normalizedText === '📊 live stock' ||
      normalizedText === '📊 all live stock'
    ) {
      const products = await fetchProductsFromDb();
      const headProds = products.filter((p) => (p.house || '').toLowerCase().includes('head'));
      const showProds = products.filter((p) => (p.house || '').toLowerCase().includes('showroom'));
      const otherProds = products.filter(
        (p) => !(p.house || '').toLowerCase().includes('head') && !(p.house || '').toLowerCase().includes('showroom')
      );

      const allMessages = [
        ...buildWarehouseLiveStockMessages(headProds, 'Head Office'),
        ...buildWarehouseLiveStockMessages(showProds, 'Showroom')
      ];
      if (otherProds.length > 0) {
        allMessages.push(...buildWarehouseLiveStockMessages(otherProds, 'Other Warehouses'));
      }

      for (let i = 0; i < allMessages.length; i++) {
        const isLast = i === allMessages.length - 1;
        await sendTelegram({
          message: allMessages[i],
          chatId,
          parseMode: 'HTML',
          replyMarkup: isLast ? DEFAULT_KEYBOARD : undefined
        });
      }
      return res.status(200).json({ ok: true, handled: 'all_live_stock' });
    }

    // 5. /low, /lowstock, or '⚠️ Low Stock'
    if (
      ['/low', '/lowstock'].includes(rawCommand) ||
      normalizedText.includes('low stock') ||
      normalizedText === '⚠️ low stock'
    ) {
      const products = await fetchProductsFromDb();
      const lowStockItems = products.filter(
        (p) => (Number(p.stock_quantity) || 0) <= 5 && (Number(p.stock_quantity) || 0) > 0
      );

      if (lowStockItems.length === 0) {
        await sendTelegram({
          message: `🟢 <b>All items well stocked!</b>\nNo products currently have ≤ 5 units.`,
          chatId,
          parseMode: 'HTML',
          replyMarkup: DEFAULT_KEYBOARD
        });
        return res.status(200).json({ ok: true, handled: 'low' });
      }

      const headLow = lowStockItems.filter((p) => (p.house || '').toLowerCase().includes('head'));
      const showLow = lowStockItems.filter((p) => (p.house || '').toLowerCase().includes('showroom'));

      let msg = `⚠️ <b>LOW STOCK PRODUCTS (≤ 5 Units):</b>\n`;
      msg += `📦 Total Low Stock: <b>${lowStockItems.length} models</b>\n────────────────────────\n`;

      if (headLow.length > 0) {
        msg += `\n🏢 <b>Head Office (${headLow.length} models):</b>\n`;
        headLow.forEach((p) => {
          msg += `• ⚠️ <b>${getProductTitle(p)}</b>: <b>${p.stock_quantity} pcs</b> (${p.category || 'N/A'})\n`;
        });
      }

      if (showLow.length > 0) {
        msg += `\n🏬 <b>Showroom (${showLow.length} models):</b>\n`;
        showLow.forEach((p) => {
          msg += `• ⚠️ <b>${getProductTitle(p)}</b>: <b>${p.stock_quantity} pcs</b> (${p.category || 'N/A'})\n`;
        });
      }

      msg += `────────────────────────\n🏢 <b>LAMS POWER ERP</b> • 🌐 <i>lamspower.pro.bd</i>`;

      const chunks = splitIntoTelegramChunks(msg, '⚠️ <b>LOW STOCK PRODUCTS</b>');
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        await sendTelegram({
          message: chunks[i],
          chatId,
          parseMode: 'HTML',
          replyMarkup: isLast ? DEFAULT_KEYBOARD : undefined
        });
      }
      return res.status(200).json({ ok: true, handled: 'low' });
    }

    // 6. /out, /outstock, or '🛑 Out of Stock'
    if (
      ['/out', '/outstock', '/outofstock'].includes(rawCommand) ||
      normalizedText.includes('out of stock') ||
      normalizedText === '🛑 out of stock'
    ) {
      const products = await fetchProductsFromDb();
      const outStockItems = products.filter((p) => (Number(p.stock_quantity) || 0) <= 0);

      if (outStockItems.length === 0) {
        await sendTelegram({
          message: `🟢 <b>No products are out of stock!</b>\nAll models currently have available units.`,
          chatId,
          parseMode: 'HTML',
          replyMarkup: DEFAULT_KEYBOARD
        });
        return res.status(200).json({ ok: true, handled: 'out' });
      }

      const headOut = outStockItems.filter((p) => (p.house || '').toLowerCase().includes('head'));
      const showOut = outStockItems.filter((p) => (p.house || '').toLowerCase().includes('showroom'));

      let msg = `🛑 <b>OUT OF STOCK PRODUCTS (0 PCS):</b>\n`;
      msg += `📦 Total Out of Stock: <b>${outStockItems.length} models</b>\n────────────────────────\n`;

      if (headOut.length > 0) {
        msg += `\n🏢 <b>Head Office (${headOut.length} models):</b>\n`;
        headOut.forEach((p) => {
          msg += `• 🛑 <b>${getProductTitle(p)}</b> (${p.category || 'N/A'})\n`;
        });
      }

      if (showOut.length > 0) {
        msg += `\n🏬 <b>Showroom (${showOut.length} models):</b>\n`;
        showOut.forEach((p) => {
          msg += `• 🛑 <b>${getProductTitle(p)}</b> (${p.category || 'N/A'})\n`;
        });
      }

      msg += `────────────────────────\n🏢 <b>LAMS POWER ERP</b> • 🌐 <i>lamspower.pro.bd</i>`;

      const chunks = splitIntoTelegramChunks(msg, '🛑 <b>OUT OF STOCK PRODUCTS</b>');
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        await sendTelegram({
          message: chunks[i],
          chatId,
          parseMode: 'HTML',
          replyMarkup: isLast ? DEFAULT_KEYBOARD : undefined
        });
      }
      return res.status(200).json({ ok: true, handled: 'out' });
    }

    // 7. /categories, /category, or '📁 Categories'
    if (
      ['/categories', '/category', '/cat'].includes(rawCommand) ||
      normalizedText.includes('categories') ||
      normalizedText === '📁 categories'
    ) {
      const products = await fetchProductsFromDb();
      const catMap = {};
      products.forEach((p) => {
        const cat = p.category || 'Uncategorized';
        const house = (p.house || 'Other').toLowerCase().includes('head') ? 'head' : 'showroom';
        if (!catMap[cat]) {
          catMap[cat] = {
            count: 0,
            totalStock: 0,
            headStock: 0,
            headCount: 0,
            showStock: 0,
            showCount: 0
          };
        }
        const qty = Number(p.stock_quantity) || 0;
        catMap[cat].count += 1;
        catMap[cat].totalStock += qty;
        if (house === 'head') {
          catMap[cat].headCount += 1;
          catMap[cat].headStock += qty;
        } else {
          catMap[cat].showCount += 1;
          catMap[cat].showStock += qty;
        }
      });

      let catMsg = `📁 <b>PRODUCT CATEGORIES INVENTORY:</b>\n────────────────────────\n`;
      Object.entries(catMap).forEach(([catName, stats], idx) => {
        catMsg += `\n${idx + 1}. <b>${catName}</b> (${stats.count} models • <b>${stats.totalStock.toLocaleString()} pcs</b>)\n`;
        catMsg += `   • 🏢 Head Office: <b>${stats.headStock.toLocaleString()} pcs</b> (${stats.headCount} models)\n`;
        catMsg += `   • 🏬 Showroom: <b>${stats.showStock.toLocaleString()} pcs</b> (${stats.showCount} models)\n`;
      });
      catMsg += `────────────────────────\n💡 <i>Type any brand or model name (e.g. <code>SolarOn</code> or <code>3600VA</code>) to search.</i>`;

      await sendTelegram({
        message: catMsg,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return res.status(200).json({ ok: true, handled: 'categories' });
    }

    // 8. Search query (either `/search query` or natural text search)
    let searchQuery = '';
    if (['/search', '/find', '/p', '/product'].includes(rawCommand)) {
      searchQuery = commandArgs;
    } else {
      // If user typed an unknown slash command like /helpme, inform them
      if (rawCommand.startsWith('/')) {
        await sendTelegram({
          message: `❓ <b>Unknown command:</b> <code>${text}</code>\n\n💡 <b>Available commands:</b>\n• <b>/stock</b> or <b>/inventory</b> - Full live stock report\n• <b>/headoffice</b> - Head Office live stock\n• <b>/showroom</b> - Showroom live stock\n• <b>/low</b> - Low stock warning (≤5 pcs)\n• <b>/out</b> - Out of stock items\n• <b>/categories</b> - Categories list\n• Type any product name (e.g. <code>SolarOn 3600</code>) to search`,
          chatId,
          parseMode: 'HTML',
          replyMarkup: DEFAULT_KEYBOARD
        });
        return res.status(200).json({ ok: true, handled: 'unknown_command' });
      }
      searchQuery = text;
    }

    if (!searchQuery.trim()) {
      await sendTelegram({
        message: '❓ Please specify a product name to search.\nExample: <code>/search SolarOn</code> or type <code>3600VA</code>',
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return res.status(200).json({ ok: true, handled: 'empty_search' });
    }

    const matches = await searchProducts(searchQuery);

    if (matches.length === 0) {
      await sendTelegram({
        message: `❌ <b>No products found</b> matching "<b>${searchQuery}</b>".\n\n💡 <i>Try searching with a shorter keyword (e.g. <code>SolarOn</code>, <code>Inhenergy</code>, <code>3600</code>, or <code>Panel</code>).</i>`,
        chatId,
        parseMode: 'HTML',
        replyMarkup: DEFAULT_KEYBOARD
      });
      return res.status(200).json({ ok: true, handled: 'search_not_found' });
    }

    // If matches found, send detailed product cards
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

    return res.status(200).json({ ok: true, handled: 'search_results' });
  } catch (err) {
    console.error('[Telegram Webhook Handler Error]:', err.message);
    return res.status(200).json({ ok: true, error: err.message });
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

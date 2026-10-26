import express from 'express';

export const router = express.Router();

/**
 * Sanitizes phone numbers by removing all non-numeric characters.
 * Example: "+880 1712-345678" -> "8801712345678"
 */
export function sanitizePhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Sends a message using Telegram Bot API
 * @param {Object} options
 * @param {string} options.message - Text to send (HTML / Markdown supported)
 * @param {string|number} [options.chatId] - Telegram Chat ID, Group ID, or Channel Username
 * @param {string} [options.parseMode='HTML'] - 'HTML', 'MarkdownV2', 'Markdown', or null
 * @param {boolean} [options.silent=false] - If true, sends without sound notification
 */
export async function sendTelegram({ message, chatId, parseMode = 'HTML', silent = false }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured in server environment (.env).');
  }
  if (!targetChatId) {
    throw new Error('Telegram Chat ID not specified in request and TELEGRAM_CHAT_ID is not configured in .env.');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: targetChatId,
    text: message,
    disable_notification: !!silent
  };

  if (parseMode) {
    payload.parse_mode = parseMode;
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let data = await response.json();

  // Graceful fallback: If HTML/Markdown entity parsing fails, retry as plain text
  if (!data.ok && parseMode && data.description && data.description.toLowerCase().includes("can't parse entities")) {
    console.warn('[Telegram API]: Entity parse error, retrying message as plain text...');
    delete payload.parse_mode;
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    data = await response.json();
  }

  if (!data.ok) {
    const errorMsg = data.description || 'Unknown Telegram API error';
    throw new Error(`Telegram Error (${data.error_code}): ${errorMsg}`);
  }

  return data.result;
}

/**
 * Sends a message using Meta WhatsApp Cloud API (Graph API)
 * @param {Object} options
 * @param {string} [options.message] - Plain text message
 * @param {string} [options.to] - Recipient phone number (with country code, e.g. 8801712345678)
 * @param {Object} [options.template] - Meta approved template payload (if outside 24h window)
 */
export async function sendWhatsApp({ message, to, template = null }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = sanitizePhoneNumber(to || process.env.WHATSAPP_DEFAULT_RECIPIENT);

  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not configured in server environment (.env).');
  }
  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is not configured in server environment (.env).');
  }
  if (!recipient) {
    throw new Error('WhatsApp recipient number not specified in request and WHATSAPP_DEFAULT_RECIPIENT is not configured in .env.');
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  let payload;
  if (template) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: template
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const err = data.error || {};
    let errorMsg = err.message || response.statusText || 'Unknown WhatsApp API error';

    if (err.code === 131047) {
      errorMsg += ' (The 24-hour customer conversation window is closed. Meta requires sending an approved template message to re-initiate).';
    } else if (err.code === 190) {
      errorMsg += ' (Access token has expired or is invalid. Please refresh WHATSAPP_ACCESS_TOKEN in .env).';
    }

    throw new Error(`WhatsApp API Error (${err.code || response.status}): ${errorMsg}`);
  }

  return data;
}

/**
 * GET /api/notify/status
 * Healthcheck & Configuration status endpoint
 */
router.get('/status', (req, res) => {
  res.json({
    telegram: {
      configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
      hasChatId: !!process.env.TELEGRAM_CHAT_ID
    },
    whatsapp: {
      configured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      hasToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      hasDefaultRecipient: !!process.env.WHATSAPP_DEFAULT_RECIPIENT
    }
  });
});

/**
 * POST /api/notify/telegram
 * Directly send to Telegram
 */
router.post('/telegram', async (req, res) => {
  try {
    const { message, chatId, parseMode, silent } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid "message" string is required.' });
    }

    const result = await sendTelegram({ message, chatId, parseMode, silent });
    return res.json({ success: true, platform: 'telegram', result });
  } catch (err) {
    console.error('[Notify Telegram Error]:', err.message);
    return res.status(500).json({ success: false, platform: 'telegram', error: err.message });
  }
});

/**
 * POST /api/notify/whatsapp
 * Directly send to WhatsApp Cloud API
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const { message, to, template } = req.body;
    if (!template && (!message || typeof message !== 'string')) {
      return res.status(400).json({ success: false, error: 'Either a "message" string or a "template" object is required.' });
    }

    const result = await sendWhatsApp({ message, to, template });
    return res.json({ success: true, platform: 'whatsapp', result });
  } catch (err) {
    console.error('[Notify WhatsApp Error]:', err.message);
    return res.status(500).json({ success: false, platform: 'whatsapp', error: err.message });
  }
});

/**
 * POST /api/notify
 * Unified notification route: broadcast to Telegram, WhatsApp, or both
 */
router.post('/', async (req, res) => {
  try {
    const {
      platform = 'all', // 'all' | 'telegram' | 'whatsapp'
      message,
      chatId,
      to,
      parseMode,
      template,
      silent
    } = req.body;

    if (!template && (!message || typeof message !== 'string')) {
      return res.status(400).json({ success: false, error: 'A valid "message" string is required.' });
    }

    const targetPlatforms = platform === 'all' ? ['telegram', 'whatsapp'] : [platform.toLowerCase()];
    const results = {};
    const errors = {};

    await Promise.all(
      targetPlatforms.map(async (plat) => {
        try {
          if (plat === 'telegram') {
            results.telegram = await sendTelegram({ message, chatId, parseMode, silent });
          } else if (plat === 'whatsapp') {
            results.whatsapp = await sendWhatsApp({ message, to, template });
          } else {
            errors[plat] = `Unsupported platform "${plat}". Use "telegram", "whatsapp", or "all".`;
          }
        } catch (err) {
          errors[plat] = err.message;
        }
      })
    );

    const hasErrors = Object.keys(errors).length > 0;
    const hasSuccess = Object.keys(results).length > 0;

    return res.status(hasErrors && !hasSuccess ? 500 : 200).json({
      success: hasSuccess,
      results,
      errors: hasErrors ? errors : undefined
    });
  } catch (err) {
    console.error('[Notify Broadcast Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

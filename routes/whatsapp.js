import express from 'express';
import crypto from 'crypto';

export const router = express.Router();

const VERIFY_TOKEN    = process.env.WHATSAPP_VERIFY_TOKEN    || 'LAMS_WA_Verify_2026_SecureToken';
const APP_SECRET      = process.env.WHATSAPP_APP_SECRET      || '';
const WA_TOKEN        = process.env.WHATSAPP_TOKEN           || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/whatsapp/webhook
// Meta calls this ONCE to verify the callback URL.
// Must echo back hub.challenge if the verify_token matches.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[WhatsApp Webhook Verify]: mode=%s token=%s', mode, token);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook]: ✅ Verified by Meta');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook]: ❌ Verification failed — token mismatch');
  return res.sendStatus(403);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/whatsapp/webhook
// Meta sends incoming messages here.
// Always respond 200 immediately; process asynchronously.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', (req, res) => {
  // Verify payload signature if App Secret is configured
  if (APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'] || '';
    const hmac = crypto
      .createHmac('sha256', APP_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (signature !== `sha256=${hmac}`) {
      console.warn('[WhatsApp Webhook]: ❌ Invalid signature — ignoring');
      return res.sendStatus(401);
    }
  }

  // Respond 200 immediately (Meta retries if response is slow/missing)
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages || messages.length === 0) return;

    const msg     = messages[0];
    const from    = msg.from;
    const msgText = msg.text?.body || '';

    console.log(`[WhatsApp]: 📩 From ${from}: "${msgText}"`);

    // Fire-and-forget auto-reply
    handleAutoReply(from, msgText).catch((err) =>
      console.error('[WhatsApp Auto-Reply Error]:', err.message)
    );
  } catch (err) {
    console.error('[WhatsApp Webhook POST Error]:', err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Send a WhatsApp text message via Cloud API
// ─────────────────────────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(to, text) {
  if (!WA_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[WhatsApp]: WA_TOKEN or PHONE_NUMBER_ID not configured — skipping send');
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log('[WhatsApp Send]:', JSON.stringify(data));
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-reply logic based on incoming message text
// ─────────────────────────────────────────────────────────────────────────────
async function handleAutoReply(from, msgText) {
  const text = (msgText || '').toLowerCase().trim();

  if (text.includes('price') || text.includes('দাম') || text.includes('rate')) {
    await sendWhatsAppMessage(
      from,
      `📋 *Lams Power — Price List*\n\nVisit our online product catalog for latest prices:\n🌐 https://lamspower.pro.bd\n\nOr contact our sales team:\n📞 +880 1955-227711\n📞 +880 1765-685900 (Kazi Sumon)`
    );
  } else if (text.includes('stock') || text.includes('available') || text.includes('আছে')) {
    await sendWhatsAppMessage(
      from,
      `📦 *Product Availability*\n\nCheck live stock on our website:\n🌐 https://lamspower.pro.bd\n\nOr call us:\n📞 +880 1955-227711`
    );
  } else if (text.includes('address') || text.includes('location') || text.includes('office')) {
    await sendWhatsAppMessage(
      from,
      `📍 *Lams Power Locations*\n\n🏢 *Corporate Office:*\n1476, Alobdi Eidgah, Mirpur 12, Dhaka\n\n🏬 *Showroom:*\nKaptan Bazar Complex, Bhaban #1, Shop #86 (1st Floor), Nawabpur Road, Dhaka-1203\nContact: +8801749116892 (Md Abdullah)\n\n🌐 https://lamspower.pro.bd`
    );
  } else {
    // Default welcome reply
    await sendWhatsAppMessage(
      from,
      `👋 *Welcome to Lams Power!*\n\nThank you for contacting us. We are a leading solar energy solutions company in Bangladesh.\n\n⚡ *Our Products:*\n• Solar Inverters & UPS\n• Solar Panels (12V / 24V)\n• Batteries & Accessories\n\n🌐 *Catalog:* https://lamspower.pro.bd\n📞 *Hotline:* +880 1955-227711\n📍 *Office:* 1476, Alobdi Eidgah, Mirpur 12, Dhaka\n\nOur team will get back to you shortly. 🙏`
    );
  }
}

export default router;

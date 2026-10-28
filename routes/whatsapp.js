import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const router = express.Router();

const getVerifyToken = () => process.env.WHATSAPP_VERIFY_TOKEN || '';
const getAppSecret = () => process.env.WHATSAPP_APP_SECRET || '';
const getWhatsAppConfig = () => ({
  token: process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || ''
});
const getAllowedNumbers = () => new Set(
  (process.env.WA_STOCK_ALLOWED_NUMBERS || '').split(',').map((number) => number.replace(/\D/g, '')).filter(Boolean)
);
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
};

router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (getVerifyToken() && mode === 'subscribe' && token === getVerifyToken()) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  const appSecret = getAppSecret();
  if (!appSecret) return res.status(503).json({ error: 'WhatsApp webhook signature verification is not configured.' });

  const signature = req.headers['x-hub-signature-256'] || '';
  const rawBody = req.rawBody;
  if (!rawBody || !signature.startsWith('sha256=')) return res.sendStatus(401);
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return res.sendStatus(401);
  }

  if (req.body?.object !== 'whatsapp_business_account') return res.sendStatus(200);
  const messages = req.body?.entry?.flatMap((entry) =>
    entry.changes?.flatMap((change) => change.value?.messages || []) || []
  ) || [];
  for (const message of messages) {
    const from = message.from;
    const text = message.text?.body?.trim();
    if (!from || !text) continue;
    try {
      await handleIncomingMessage(from, text);
    } catch (error) {
      console.error('[WhatsApp reply error]:', error.message);
    }
  }

  // Wait for the reply API call before ending the serverless invocation.
  return res.sendStatus(200);
});

export async function sendWhatsAppMessage(to, text) {
  const { token, phoneNumberId } = getWhatsAppConfig();
  if (!token || !phoneNumberId) throw new Error('WhatsApp Cloud API credentials are not configured.');
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `WhatsApp API returned ${response.status}`);
  return data;
}

function normalize(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: '2-digit'
  }).format(new Date(value));
}

async function getProductStock(query) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('WhatsApp stock lookup requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL.');

  const normalizedQuery = normalize(query.replace(/\b(stock|available|availability|please|show|check)\b/gi, ' '));
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!terms.length) return { kind: 'help' };

  const { data: products, error } = await supabase.from('products')
    .select('id, name, model, house, stock_quantity').limit(5000);
  if (error) throw error;

  const matches = (products || []).filter((product) => {
    const searchable = normalize(`${product.name} ${product.model}`);
    return terms.every((term) => searchable.includes(term));
  });
  if (!matches.length) return { kind: 'not_found' };

  // A product can be stored as two rows, one per stock location. Combine those rows by name/model.
  const grouped = new Map();
  for (const product of matches) {
    const key = normalize(`${product.name} ${product.model}`);
    const current = grouped.get(key) || {
      name: product.name, model: product.model, headOffice: 0, showroom: 0, productIds: []
    };
    const house = String(product.house || '').toLowerCase();
    const quantity = Number(product.stock_quantity) || 0;
    if (house === 'head office') current.headOffice += quantity;
    if (house === 'showroom') current.showroom += quantity;
    current.productIds.push(product.id);
    grouped.set(key, current);
  }

  const exact = [...grouped.values()].filter((product) => normalize(`${product.name} ${product.model}`) === normalizedQuery);
  const selected = exact.length ? exact : [...grouped.values()];
  if (selected.length > 1) return { kind: 'ambiguous', products: selected.slice(0, 8) };

  const product = selected[0];
  const { data: itemRows, error: historyError } = await supabase.from('chalan_items')
    .select('product_id, chalans!inner(chalan_no, bill_no, created_at, status)')
    .in('product_id', product.productIds);
  if (historyError) throw historyError;

  const completed = (itemRows || [])
    .map((row) => Array.isArray(row.chalans) ? row.chalans[0] : row.chalans)
    .filter((chalan) => chalan && ['paid', 'completed'].includes(String(chalan.status || '').toLowerCase()))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  return {
    kind: 'found', product,
    lastReference: completed?.bill_no || completed?.chalan_no || 'N/A',
    lastDate: completed ? formatDate(completed.created_at) : 'No completed bill/challan found'
  };
}

function formatStockReply(result) {
  if (result.kind === 'help') return 'Send a product name or model, for example: SolarOn 3600. You can also send “SolarOn stock”.';
  if (result.kind === 'not_found') return 'I could not find a matching product. Try the full product name or model, e.g. SolarOn 3600.';
  if (result.kind === 'ambiguous') {
    const choices = result.products.map((product) => `• ${product.name} ${product.model || ''}`.trim()).join('\n');
    return `Several products match. Please send the model too:\n${choices}`;
  }
  const { product } = result;
  return `📦 ${product.name}${product.model ? ` ${product.model}` : ''}\n🏢 HO: ${product.headOffice} pcs\n🏬 Showroom: ${product.showroom} pcs\n📊 Total: ${product.headOffice + product.showroom} pcs\n🧾 Last bill/challan: ${result.lastReference}\n📅 Date: ${result.lastDate}`;
}

async function handleIncomingMessage(from, text) {
  const normalized = normalize(text);
  if (normalized === 'help' || normalized === 'menu' || normalized === 'hi' || normalized === 'hello') {
    await sendWhatsAppMessage(from, 'Welcome to Lams Power. For stock, send a product name/model such as “SolarOn 3600”.');
    return;
  }
  if (normalized.includes('price') || text.includes('দাম') || normalized.includes('rate')) {
    await sendWhatsAppMessage(from, 'Please visit https://lamspower.pro.bd for product prices or contact our sales team.');
    return;
  }
  if (normalized.includes('address') || normalized.includes('location') || normalized.includes('office')) {
    await sendWhatsAppMessage(from, 'Corporate Office: 1476, Alobdi Eidgah, Mirpur 12, Dhaka. Showroom: Kaptan Bazar Complex, Bhaban #1, Shop #86, Nawabpur Road, Dhaka-1203.');
    return;
  }

  if (!getAllowedNumbers().has(from.replace(/\D/g, ''))) {
    await sendWhatsAppMessage(from, 'This number is not authorized for inventory lookups. Please contact an administrator.');
    return;
  }
  try {
    const result = await getProductStock(text);
    await sendWhatsAppMessage(from, formatStockReply(result));
  } catch (error) {
    console.error('[WhatsApp stock lookup error]:', error.message);
    await sendWhatsAppMessage(from, 'I could not retrieve stock right now. Please try again shortly.');
  }
}

export default router;

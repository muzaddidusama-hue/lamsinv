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

function parseStockQuery(query) {
  const normalized = normalize(query);
  const house = /\bshowroom\b/.test(normalized)
    ? 'Showroom'
    : (/\bho\b|\bhead office\b|\bheadoffice\b/.test(normalized) ? 'Head Office' : null);
  const searchText = normalized
    .replace(/\bhead office\b/g, ' ')
    .replace(/\b(showroom|headoffice|ho|stock|current|all|available|availability|please|show|check|inventory)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { house, terms: searchText.split(' ').filter(Boolean) };
}

async function getStockReport(query) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('WhatsApp stock lookup requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL.');

  const { house, terms } = parseStockQuery(query);
  const { data: products, error } = await supabase.from('products')
    .select('id, name, model, house, stock_quantity').limit(5000);
  if (error) throw error;

  // A product may be stored as separate HO and Showroom rows; merge those rows by name/model.
  const grouped = new Map();
  for (const product of products || []) {
    const key = normalize(`${product.name} ${product.model}`);
    if (!key || !terms.every((term) => key.includes(term))) continue;

    const current = grouped.get(key) || {
      name: product.name || '', model: product.model || '', headOffice: 0, showroom: 0, productIds: []
    };
    const quantity = Number(product.stock_quantity) || 0;
    if (String(product.house || '').toLowerCase() === 'showroom') current.showroom += quantity;
    else current.headOffice += quantity;
    current.productIds.push(product.id);
    grouped.set(key, current);
  }

  let results = [...grouped.values()];
  if (!results.length) return { kind: 'not_found', house };

  const isFullReport = terms.length === 0;
  if (!isFullReport) {
    try {
      const productIds = results.flatMap((product) => product.productIds);
      const { data: itemRows, error: historyError } = await supabase.from('chalan_items')
        .select('product_id, chalans!inner(chalan_no, bill_no, created_at, status)')
        .in('product_id', productIds);
      if (historyError) throw historyError;

      const latestByProductId = new Map();
      for (const row of itemRows || []) {
        const chalan = Array.isArray(row.chalans) ? row.chalans[0] : row.chalans;
        if (!chalan || !['paid', 'completed'].includes(String(chalan.status || '').toLowerCase())) continue;
        const previous = latestByProductId.get(row.product_id);
        if (!previous || new Date(chalan.created_at) > new Date(previous.created_at)) {
          latestByProductId.set(row.product_id, chalan);
        }
      }
      results = results.map((product) => {
        const latest = product.productIds.map((id) => latestByProductId.get(id)).filter(Boolean)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        return {
          ...product,
          lastReference: latest?.bill_no || latest?.chalan_no || 'N/A',
          lastDate: latest ? formatDate(latest.created_at) : 'No completed bill/challan found'
        };
      });
    } catch (error) {
      console.error('[WhatsApp stock history lookup error]:', error.message);
    }
  }

  results.sort((a, b) => `${a.name} ${a.model}`.localeCompare(`${b.name} ${b.model}`));
  return {
    kind: 'report',
    house,
    isFullReport,
    products: results,
    totalHeadOffice: results.reduce((sum, product) => sum + product.headOffice, 0),
    totalShowroom: results.reduce((sum, product) => sum + product.showroom, 0)
  };
}

function formatStockReplies(result) {
  if (result.kind === 'not_found') {
    return ['No matching products found. Try a product name or model, e.g. SolarOn 3600.'];
  }

  const locationLabel = result.house || 'All locations';
  const total = result.totalHeadOffice + result.totalShowroom;
  const heading = result.isFullReport
    ? `📦 Current stock — ${locationLabel}\nItems: ${result.products.length} | HO: ${result.totalHeadOffice} pcs | Showroom: ${result.totalShowroom} pcs | Total: ${total} pcs`
    : `📦 Stock matches — ${locationLabel}\nFound ${result.products.length} product(s) | Total: ${total} pcs`;
  const lines = result.products.map((product) => {
    const title = `${product.name}${product.model ? ` ${product.model}` : ''}`.trim();
    const stock = result.house === 'Showroom'
      ? `Showroom ${product.showroom}`
      : result.house === 'Head Office'
        ? `HO ${product.headOffice}`
        : `HO ${product.headOffice} | Showroom ${product.showroom} | Total ${product.headOffice + product.showroom}`;
    const lastUpdate = !result.isFullReport && product.lastDate
      ? ` | Last: ${product.lastDate}${product.lastReference && product.lastReference !== 'N/A' ? ` (${product.lastReference})` : ''}`
      : '';
    return `• ${title}: ${stock} pcs${lastUpdate}`;
  });

  const messages = [];
  let current = heading;
  for (const line of lines) {
    if (current.length + line.length + 1 > 3200) {
      messages.push(current);
      current = `📦 Stock — ${locationLabel} (continued)`;
    }
    current += `\n${line}`;
  }
  messages.push(current);
  return messages;
}

async function sendWhatsAppMessages(to, messages) {
  for (const message of messages) await sendWhatsAppMessage(to, message);
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
    const result = await getStockReport(text);
    await sendWhatsAppMessages(from, formatStockReplies(result));
  } catch (error) {
    console.error('[WhatsApp stock lookup error]:', error.message);
    await sendWhatsAppMessage(from, 'I could not retrieve stock right now. Please try again shortly.');
  }
}

export default router;

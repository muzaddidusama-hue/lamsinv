/**
 * Notification Service Utility
 * Facilitates sending Telegram and WhatsApp notifications from frontend components.
 */

const API_BASE = '/api/notify';

/**
 * Checks whether Telegram and WhatsApp credentials are configured on the backend.
 * @returns {Promise<{telegram: {configured: boolean}, whatsapp: {configured: boolean}}>}
 */
export async function getNotificationStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to get notification status:', err);
    return null;
  }
}

/**
 * Sends a notification via Telegram.
 * @param {string} message - Text or HTML formatted message
 * @param {Object} [options]
 * @param {string|number} [options.chatId] - Override default chat ID
 * @param {string} [options.parseMode='HTML'] - 'HTML' or 'Markdown'
 * @param {boolean} [options.silent=false] - Silent notification
 */
export async function sendTelegramNotification(message, options = {}) {
  const payload = {
    message,
    chatId: options.chatId,
    parseMode: options.parseMode || 'HTML',
    silent: !!options.silent
  };

  const response = await fetch(`${API_BASE}/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to send Telegram message');
  }
  return data;
}

/**
 * Sends a notification via Meta WhatsApp Cloud API.
 * @param {string} message - Plain text message
 * @param {Object} [options]
 * @param {string} [options.to] - Recipient phone number (e.g. "8801712345678")
 * @param {Object} [options.template] - Meta template payload (if outside 24h window)
 */
export async function sendWhatsAppNotification(message, options = {}) {
  const payload = {
    message,
    to: options.to,
    template: options.template
  };

  const response = await fetch(`${API_BASE}/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to send WhatsApp message');
  }
  return data;
}

/**
 * Unified notification dispatcher (broadcast to Telegram, WhatsApp, or both).
 * @param {Object} options
 * @param {'all'|'telegram'|'whatsapp'} [options.platform='all']
 * @param {string} options.message - The notification message
 * @param {string} [options.chatId] - Optional Telegram chat ID override
 * @param {string} [options.to] - Optional WhatsApp recipient phone override
 * @param {string} [options.parseMode='HTML'] - Telegram parse mode
 * @param {Object} [options.template] - WhatsApp template payload
 * @param {boolean} [options.silent=false]
 */
export async function sendNotification({
  platform = 'all',
  message,
  chatId,
  to,
  parseMode = 'HTML',
  template,
  silent = false
}) {
  const payload = {
    platform,
    message,
    chatId,
    to,
    parseMode,
    template,
    silent
  };

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    const errorDetails = data.errors ? JSON.stringify(data.errors) : (data.error || 'Notification failed');
    throw new Error(errorDetails);
  }
  return data;
}

/* ==========================================================================
   Pre-built Notification Message Formatters for Inventory Operations
   ========================================================================== */

/**
 * Low stock alert message builder
 */
export function formatLowStockMessage({ productName, currentStock, minStock, brand }) {
  return [
    `⚠️ <b>LOW STOCK ALERT</b>`,
    `<b>Product:</b> ${productName}`,
    brand ? `<b>Brand:</b> ${brand}` : null,
    `<b>Remaining Stock:</b> 🔴 ${currentStock}`,
    minStock !== undefined ? `<b>Threshold:</b> ${minStock}` : null,
    `<b>Time:</b> ${new Date().toLocaleString()}`
  ].filter(Boolean).join('\n');
}

/**
 * New bill / sale generated alert message builder
 */
export function formatNewBillMessage({ billNo, customerName, totalAmount, itemsCount, date }) {
  return [
    `🧾 <b>NEW BILL GENERATED</b>`,
    `<b>Invoice #:</b> ${billNo}`,
    customerName ? `<b>Customer:</b> ${customerName}` : null,
    `<b>Total Amount:</b> ৳${Number(totalAmount).toLocaleString()}`,
    itemsCount !== undefined ? `<b>Items Count:</b> ${itemsCount}` : null,
    `<b>Date:</b> ${date || new Date().toLocaleDateString()}`
  ].filter(Boolean).join('\n');
}

/**
 * Broken / damaged inventory alert builder
 */
export function formatBrokenStockMessage({ productName, quantity, reason, reportedBy }) {
  return [
    `🛑 <b>DAMAGED PRODUCT REPORTED</b>`,
    `<b>Product:</b> ${productName}`,
    `<b>Quantity:</b> ${quantity}`,
    reason ? `<b>Reason:</b> ${reason}` : null,
    reportedBy ? `<b>Reported By:</b> ${reportedBy}` : null,
    `<b>Date:</b> ${new Date().toLocaleString()}`
  ].filter(Boolean).join('\n');
}

/**
 * Return / Exchange alert message builder
 */
export function formatReturnMessage({ billNo, customerName, productName, quantity, refundAmount }) {
  return [
    `🔄 <b>PRODUCT RETURN LOGGED</b>`,
    billNo ? `<b>Bill #:</b> ${billNo}` : null,
    customerName ? `<b>Customer:</b> ${customerName}` : null,
    `<b>Product:</b> ${productName}`,
    `<b>Quantity Returned:</b> ${quantity}`,
    refundAmount !== undefined ? `<b>Refund Amount:</b> ৳${Number(refundAmount).toLocaleString()}` : null,
    `<b>Date:</b> ${new Date().toLocaleString()}`
  ].filter(Boolean).join('\n');
}

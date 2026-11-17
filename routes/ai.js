import express from 'express';
import process from 'node:process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateEmployee } from './auth.js';

export const router = express.Router();

router.post('/parse-invoice', authenticateEmployee, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const { imageBase64, mimeType, uploadMode } = req.body || {};
  if (!apiKey) return res.status(503).json({ error: 'Invoice scanning is not configured on the server.' });
  if (typeof imageBase64 !== 'string' || imageBase64.length > 8_000_000) return res.status(400).json({ error: 'Image is missing or exceeds the 6 MB limit.' });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are supported.' });

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Analyze this ${uploadMode === 'Challan' ? 'Challan' : 'Bill'}. Extract info and return ONLY valid JSON using this shape: { "bill_no": "string", "chalan_no": "string", "customer_name": "string", "customer_phone": "string", "customer_address": "string", "items": [ { "description": "string", "quantity": number, "unit_price": number, "total_price": number } ] }`;
    const result = await model.generateContent([prompt, { inlineData: { data: imageBase64, mimeType } }]);
    const responseText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonText = responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonText);
    if (!parsed || !Array.isArray(parsed.items)) throw new Error('The AI response did not include a valid items list.');
    return res.json({ data: parsed });
  } catch (error) {
    console.error('[Invoice AI parse failed]:', error.message);
    return res.status(502).json({ error: 'Could not read this invoice image. Try a clearer image.' });
  }
});

export default router;

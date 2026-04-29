import { Router } from 'express';
import { getWAStatus, getLastQR, ensureWA, sendTestMessage } from './client.js';
import QRCode from 'qrcode';

export const whatsappRouter = Router();

whatsappRouter.get('/status', async (_req, res) => {
  try {
    const s = getWAStatus();
    res.json(s);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'error' });
  }
});

whatsappRouter.get('/qr', async (_req, res) => {
  try {
    const qr = getLastQR();
    if (!qr) return res.json({ qr: null, note: 'no qr available (maybe connected or connecting)' });
    const dataUrl = await QRCode.toDataURL(qr);
    res.json({ qr: dataUrl });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'error' });
  }
});

whatsappRouter.post('/send-test', async (req, res) => {
  try {
    const { to, message } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
    await ensureWA();
    await sendTestMessage(to, message);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'error' });
  }
});

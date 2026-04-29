import { Router } from 'express';
import { orchestrate } from './route.js';

export const orchestratorRouter = Router();

orchestratorRouter.post('/inbound', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' });
    const out = await orchestrate(text);
    res.json(out);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'error' });
  }
});

import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';
import { handleInbound } from './onMessage.js';

let sock: ReturnType<typeof makeWASocket> | null = null;
let lastQR: string | null = null;
let status: 'idle' | 'qr' | 'connecting' | 'connected' | 'closed' = 'idle';

const AUTH_DIR = process.env.WA_AUTH_DIR || path.join(process.cwd(), '.wa-auth');

async function start() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  status = 'connecting';
  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u as any;
    if (qr) { lastQR = qr; status = 'qr'; }
    if (connection === 'open') { status = 'connected'; lastQR = null; }
    else if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      status = 'closed';
      if (shouldReconnect) start().catch(() => {});
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;
      const msg = m.messages?.[0];
      if (!msg || msg.key.fromMe) return;
      const { reply } = await handleInbound(msg);
      await sock!.sendMessage(msg.key.remoteJid!, { text: reply });
    } catch (e) { console.error('[wa msg err]', e); }
  });
}

export async function ensureWA() {
  if (!sock) await start();
  return sock!;
}

export function getWAStatus() { return { status, hasQR: !!lastQR }; }
export function getLastQR() { return lastQR; }
export async function sendTestMessage(toJid: string, message: string) {
  const s = await ensureWA();
  await s.sendMessage(toJid, { text: message });
}

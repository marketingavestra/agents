"use client";

import { useEffect, useState } from "react";

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API = isLocal ? "http://localhost:4000" : (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000");

type WaStatus = { status: string; hasQR: boolean };

export default function WhatsAppChannelPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("Olá! Teste do canal.");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function refreshStatus() {
    try {
      const r = await fetch(`${API}/api/channels/whatsapp/status`, { cache: "no-store" });
      const j = await r.json();
      setStatus(j);
    } catch (e) { console.error(e); }
  }
  async function refreshQR() {
    try {
      const r = await fetch(`${API}/api/channels/whatsapp/qr`, { cache: "no-store" });
      const j = await r.json();
      if (j.qr) setQr(j.qr); else { setQr(null); setNote(j.note || "Sem QR disponível"); }
    } catch (e) { console.error(e); }
  }
  async function sendTest() {
    if (!to || !message) { setNote("Preencha número e mensagem"); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/channels/whatsapp/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });
      const j = await r.json();
      if (j.ok) setNote("Mensagem enviada!"); else setNote(j.error || "Falha");
    } catch (e: any) {
      setNote(e?.message || "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshStatus();
    const id = setInterval(refreshStatus, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Canal: WhatsApp (QR)</h1>
      <p className="text-sm text-gray-600">Status: {status ? `${status.status} (hasQR=${status.hasQR})` : "carregando..."}</p>
      <div className="flex gap-3">
        <button className="px-3 py-2 bg-slate-800 text-white rounded" onClick={refreshStatus}>Atualizar Status</button>
        <button className="px-3 py-2 bg-slate-800 text-white rounded" onClick={refreshQR}>Mostrar QR</button>
      </div>
      {qr && (
        <div className="border rounded p-3">
          <img src={qr} alt="QR" className="w-64 h-64" />
          <p className="text-sm text-gray-500">Escaneie com WhatsApp &gt; Aparelhos conectados</p>
        </div>
      )}

      <div className="border rounded p-4 space-y-2">
        <h2 className="font-medium">Enviar teste</h2>
        <input className="border px-2 py-1 w-full" placeholder="55DDDNUMERO@s.whatsapp.net" value={to} onChange={e=>setTo(e.target.value)} />
        <input className="border px-2 py-1 w-full" placeholder="Mensagem" value={message} onChange={e=>setMessage(e.target.value)} />
        <button disabled={busy} className="px-3 py-2 bg-emerald-600 text-white rounded" onClick={sendTest}>{busy?"Enviando...":"Enviar"}</button>
      </div>

      {note && <p className="text-sm text-amber-600">{note}</p>}
    </main>
  );
}

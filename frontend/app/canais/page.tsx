export default function CanaisIndex() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Canais</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li><a className="text-blue-500 underline" href="/canais/whatsapp">WhatsApp (QR)</a></li>
        <li className="text-gray-500">Google Calendar (em breve)</li>
        <li className="text-gray-500">Calendário próprio (em breve)</li>
      </ul>
    </main>
  );
}

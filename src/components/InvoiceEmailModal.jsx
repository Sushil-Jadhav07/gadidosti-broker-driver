import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import Modal from "./broker/Modal";
import { useToast } from "../hooks/useToast";
import { api, getToken } from "../services/api";

// Shared by broker's JobDetail.jsx (sending the invoice to the client) and driver's
// TripDetail.jsx (same action, same booking-level endpoint) — manual send only, nothing here
// auto-sends. to/subject/message all start pre-filled with sensible defaults but stay fully
// editable, since the whole point is "give me the option to write the mail" rather than a
// one-click auto-send.
export default function InvoiceEmailModal({ isOpen, onClose, bookingId, defaultTo = "", bookingRef }) {
  const { addToast } = useToast();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTo(defaultTo);
    setSubject(`Invoice for booking ${bookingRef || ""}`.trim());
    setMessage(`Hi,\n\nPlease find attached the invoice for booking ${bookingRef || ""}.\n\nThanks,\nGadiDost`);
  }, [isOpen, defaultTo, bookingRef]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      addToast("To, subject, and message are all required.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/api/bookings/${bookingId}/invoice/email`, { to: to.trim(), subject: subject.trim(), message: message.trim() }, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to send invoice");
      addToast("Invoice emailed.", "success");
      onClose();
    } catch (err) {
      addToast(err.message || "Failed to send invoice.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Invoice by Email" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5"><Mail size={13} /> To</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="client@example.com"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
          <button onClick={handleSend} disabled={sending} className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60">
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

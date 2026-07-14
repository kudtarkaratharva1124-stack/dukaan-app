export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

// Builds a wa.me deep link with a prefilled message. No API key or backend call
// needed — this just opens WhatsApp (app or web) with the text pre-typed; the
// shop owner still hits send themselves. Assumes Indian 10-digit numbers when
// no country code is present, since DukaanPro targets Indian kirana stores.
export function buildWhatsAppLink(phone, message) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

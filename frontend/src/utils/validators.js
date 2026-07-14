export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

export function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test((phone || "").replace(/\D/g, "").slice(-10));
}

export function minLength(value, len) {
  return (value || "").length >= len;
}

// Generates a human-friendly, roughly-sortable order number, e.g. ORD-240711-4821
export function generateOrderNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${yy}${mm}${dd}-${rand}`;
}

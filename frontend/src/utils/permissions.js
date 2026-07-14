// Simple role gate: owner/manager can manage inventory & settings, cashier/staff can only bill.
const MANAGE_ROLES = ["owner", "manager"];

export function canManageInventory(role) {
  return MANAGE_ROLES.includes(role);
}

export function canManageSettings(role) {
  return role === "owner";
}

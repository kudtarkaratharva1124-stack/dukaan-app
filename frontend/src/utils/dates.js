import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date, pattern = "dd MMM yyyy") {
  if (!date) return "";
  return format(new Date(date), pattern);
}

export function formatDateTime(date) {
  if (!date) return "";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function timeAgo(date) {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

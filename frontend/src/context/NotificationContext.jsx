import { createContext, useState, useCallback } from "react";
import { notify } from "../components/ui/Toast.jsx";

export const NotificationContext = createContext(null);

// Thin wrapper so pages can call useNotification() instead of importing
// react-hot-toast directly, and so we have a single place to add
// in-app notification history later (low stock alerts, renewal reminders, etc).
export function NotificationProvider({ children }) {
  const [history, setHistory] = useState([]);

  const push = useCallback((message, type = "info") => {
    setHistory((h) => [{ id: Date.now(), message, type, at: new Date() }, ...h].slice(0, 50));
    notify[type] ? notify[type](message) : notify.info(message);
  }, []);

  return (
    <NotificationContext.Provider value={{ history, push }}>
      {children}
    </NotificationContext.Provider>
  );
}

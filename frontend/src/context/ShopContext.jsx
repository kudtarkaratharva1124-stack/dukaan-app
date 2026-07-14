import { createContext, useCallback, useContext, useState } from "react";
import { dashboardService } from "../services/dashboard.service.js";
import { AuthContext } from "./AuthContext.jsx";

export const ShopContext = createContext(null);

export function ShopProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const refreshSummary = useCallback(async () => {
    if (!isAuthenticated) return;
    setSummaryLoading(true);
    try {
      const data = await dashboardService.summary();
      setSummary(data);
    } finally {
      setSummaryLoading(false);
    }
  }, [isAuthenticated]);

  return (
    <ShopContext.Provider value={{ summary, summaryLoading, refreshSummary }}>
      {children}
    </ShopContext.Provider>
  );
}

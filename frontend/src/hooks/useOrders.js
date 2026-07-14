import { useCallback, useEffect, useState } from "react";
import { orderService } from "../services/order.service.js";

export function useOrders(initialParams = {}) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.list(params);
      setOrders(data.orders);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load orders");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, total, totalPages, loading, error, params, setParams, reload: load };
}

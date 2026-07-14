import { useCallback, useEffect, useState } from "react";
import { inventoryService } from "../services/inventory.service.js";

export function useInventory(initialParams = {}) {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.list(params);
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load inventory");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  return { products, total, totalPages, loading, error, params, setParams, reload: load };
}

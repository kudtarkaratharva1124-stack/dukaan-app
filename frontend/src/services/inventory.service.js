import { api } from "./api.js";

export const inventoryService = {
  async list(params = {}) {
    const { data } = await api.get("/inventory", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/inventory/${id}`);
    return data.product;
  },
  async create(payload) {
    const { data } = await api.post("/inventory", payload);
    return data.product;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/inventory/${id}`, payload);
    return data.product;
  },
  async remove(id) {
    await api.delete(`/inventory/${id}`);
  },
  async adjustStock(id, changeQty, reason) {
    const { data } = await api.post(`/inventory/${id}/adjust-stock`, { changeQty, reason });
    return data.product;
  },
  async lookupByBarcode(barcode) {
    const { data } = await api.get("/inventory/lookup", { params: { barcode } });
    return data; // { success, source: 'inventory'|'catalog'|'online'|'none', product, catalogMatch }
  },
  async listCategories() {
    const { data } = await api.get("/inventory/categories");
    return data.categories;
  },
  async createCategory(name) {
    const { data } = await api.post("/inventory/categories", { name });
    return data.category;
  }
};

import { api } from "./api.js";

export const orderService = {
  async list(params = {}) {
    const { data } = await api.get("/orders", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/orders/${id}`);
    return data.order;
  },
  async create(payload) {
    const { data } = await api.post("/orders", payload);
    return data.order;
  }
};

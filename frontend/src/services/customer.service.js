import { api } from "./api.js";

export const customerService = {
  async list(params = {}) {
    const { data } = await api.get("/customers", { params });
    return data.customers;
  },
  async create(payload) {
    const { data } = await api.post("/customers", payload);
    return data.customer;
  }
};

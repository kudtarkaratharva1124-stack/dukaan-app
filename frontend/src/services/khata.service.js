import { api } from "./api.js";

export const khataService = {
  async summary() {
    const { data } = await api.get("/khata/summary");
    return data.summary;
  },
  async listCustomers(params = {}) {
    const { data } = await api.get("/khata/customers", { params });
    return data.customers;
  },
  async getLedger(customerId) {
    const { data } = await api.get(`/khata/customers/${customerId}`);
    return data;
  },
  async addEntry(customerId, payload) {
    const { data } = await api.post(`/khata/customers/${customerId}/entries`, payload);
    return data.entry;
  },
  async deleteEntry(entryId) {
    const { data } = await api.delete(`/khata/entries/${entryId}`);
    return data;
  }
};

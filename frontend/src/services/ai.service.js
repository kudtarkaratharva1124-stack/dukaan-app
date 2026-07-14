import { api } from "./api.js";

export const aiService = {
  async recognizeProduct(imageBase64, mimeType) {
    const { data } = await api.post("/ai/recognize-product", { imageBase64, mimeType });
    return data.result;
  },
  async extractInvoice(imageBase64, mimeType) {
    const { data } = await api.post("/ai/extract-invoice", { imageBase64, mimeType });
    return data.result;
  },
  async getInventoryPrediction(params = {}) {
    const { data } = await api.get("/ai/inventory-prediction", { params });
    return data;
  }
};

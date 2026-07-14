import { api } from "./api.js";

export const dashboardService = {
  async summary() {
    const { data } = await api.get("/dashboard/summary");
    return data.summary;
  }
};

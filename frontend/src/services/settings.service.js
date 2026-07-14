import { api } from "./api.js";

export const settingsService = {
  async getShop() {
    const { data } = await api.get("/settings/shop");
    return data.shop;
  },
  async updateShop(payload) {
    const { data } = await api.put("/settings/shop", payload);
    return data.shop;
  },
  async updateProfile(payload) {
    const { data } = await api.put("/settings/profile", payload);
    return data.user;
  },
  async changePassword(payload) {
    const { data } = await api.put("/settings/password", payload);
    return data;
  },
  async listTeam() {
    const { data } = await api.get("/settings/team");
    return data.team;
  },
  async inviteTeamMember(payload) {
    const { data } = await api.post("/settings/team", payload);
    return data.user;
  },
  async updateTeamMember(userId, payload) {
    const { data } = await api.patch(`/settings/team/${userId}`, payload);
    return data.user;
  }
};

import api from "./api";

const BASE = "/api/user";

export const userService = {
  create: async (payload) => {
    const { data } = await api.post(BASE, payload);
    return data;
  },

  getAll: async (skip = 0, limit = 100) => {
    const { data } = await api.get(`${BASE}/all`, { params: { skip, limit } });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`${BASE}/${id}`);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`${BASE}/${id}`, payload);
    return data;
  },

  updateMe: async (payload) => {
    const { data } = await api.patch(`${BASE}/me`, payload);
    return data;
  },
};

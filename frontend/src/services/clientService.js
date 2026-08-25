import api from "./api";

const BASE = "/api/client";

export const clientService = {
  getAll: async (skip = 0, limit = 20) => {
    const { data } = await api.get(`${BASE}/all`, { params: { skip, limit } });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`${BASE}/${id}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post(`${BASE}/create`, payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`${BASE}/${id}`, payload);
    return data;
  },

  remove: async (id) => {
    await api.delete(`${BASE}/${id}`);
  },
};

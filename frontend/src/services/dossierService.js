import api from "./api";

const BASE = "/api/dossier";

export const dossierService = {
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

  affecter: async (id, payload) => {
    const { data } = await api.patch(`${BASE}/${id}/affecter`, payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`${BASE}/${id}`, payload);
    return data;
  },

  updateStatut: async (id, payload) => {
    const { data } = await api.patch(`${BASE}/${id}/statut`, payload);
    return data;
  },

  transfer: async (id, motif) => {
    const { data } = await api.patch(`${BASE}/${id}/transfer`, { motif });
    return data;
  },

  remove: async (id) => {
    await api.delete(`${BASE}/${id}`);
  },
};

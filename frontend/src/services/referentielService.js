import api from "./api";

const BASE = "/api/referentiel";

export const referentielService = {
  getTypeAffaires: async () => {
    const { data } = await api.get(`${BASE}/type_affaires`);
    return data;
  },

  createTypeAffaire: async (libelle) => {
    const { data } = await api.post(`${BASE}/type_affaires/create`, { libelle });
    return data;
  },

  updateTypeAffaire: async (id, payload) => {
    const { data } = await api.put(`${BASE}/type_affaires/${id}`, payload);
    return data;
  },

  deleteTypeAffaire: async (id) => {
    await api.delete(`${BASE}/type_affaires/${id}`);
  },

  getSpecialites: async () => {
    const { data } = await api.get(`${BASE}/specialites`);
    return data;
  },

  createSpecialite: async (payload) => {
    const { data } = await api.post(`${BASE}/specialites/create`, payload);
    return data;
  },

  updateSpecialite: async (id, payload) => {
    const { data } = await api.put(`${BASE}/specialites/${id}`, payload);
    return data;
  },

  deleteSpecialite: async (id) => {
    await api.delete(`${BASE}/specialites/${id}`);
  },
};

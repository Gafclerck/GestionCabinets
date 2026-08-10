import api from "./api";

const BASE = "/api/discussion";

export const discussionService = {
  getByDossier: async (dossierId) => {
    const { data } = await api.get(`${BASE}/dossier/${dossierId}`);
    return data;
  },

  create: async ({ sujet, description = null, dossier_id = null }) => {
    const { data } = await api.post(BASE, { sujet, description, dossier_id });
    return data;
  },

  getMessages: async (discussionId, skip = 0, limit = 200) => {
    const { data } = await api.get(`${BASE}/${discussionId}/messages`, { params: { skip, limit } });
    return data;
  },

  sendMessage: async (discussionId, contenu) => {
    const { data } = await api.post(`${BASE}/${discussionId}/messages`, { contenu });
    return data;
  },
};

import api from "./api";

const BASE = "/api/discussion";

export const discussionService = {
  getByDossier: async (dossierId) => {
    const { data } = await api.get(`${BASE}/dossier/${dossierId}`);
    return data;
  },

  getMessages: async (discussionId, skip = 0, limit = 100) => {
    const { data } = await api.get(`${BASE}/${discussionId}/messages`, { params: { skip, limit } });
    return data;
  },

  sendMessage: async (dossierId, contenu) => {
    const { data } = await api.post(`${BASE}/${dossierId}/messages`, { contenu });
    return data;
  },
};

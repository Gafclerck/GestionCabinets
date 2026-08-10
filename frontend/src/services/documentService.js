import api from "./api";

const BASE = "/api/document";

export const documentService = {
  getAll: async (dossierId) => {
    const { data } = await api.get(`${BASE}/dossier/${dossierId}`);
    return data;
  },

  upload: async (dossierId, { fichier, description = "", confidentiel = false }) => {
    const formData = new FormData();
    formData.append("fichier", fichier);
    formData.append("description", description);
    formData.append("confidentiel", confidentiel);
    const { data } = await api.post(`${BASE}/dossier/${dossierId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  remove: async (id) => {
    await api.delete(`${BASE}/${id}`);
  },

  download: async (id) => {
    const response = await api.get(`${BASE}/${id}/fichier`, { responseType: "blob" });
    return response;
  },
};

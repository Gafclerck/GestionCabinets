import api from "./api";

const BASE = "/api/historique/dossier";

export const historiqueService = {
  getByDossierId: async (id, skip = 0, limit = 50) => {
    const { data } = await api.get(`${BASE}/${id}`, { params: { skip, limit } });
    return data;
  },
};

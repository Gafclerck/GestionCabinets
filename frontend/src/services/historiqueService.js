import api from "./api";

const BASE = "/api/historique/dossier";

export const historiqueService = {
  

  getById: async (id) => {
    const { data } = await api.get(`${BASE}/${id}`);
    return data;
  },

}
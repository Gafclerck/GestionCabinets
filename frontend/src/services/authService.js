import api from "./api";

export async function login(email, password) {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const { data } = await api.post("/api/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function getProfile() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

export async function register(userData) {
  const { data } = await api.post("/api/auth/register", userData);
  return data;
}

export async function changePassword(payload) {
  const { data } = await api.post("/api/auth/change-password", payload);
  return data;
}

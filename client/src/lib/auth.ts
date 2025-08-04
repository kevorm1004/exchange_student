import { apiRequest } from "./queryClient";
import type { LoginData, RegisterData } from "@shared/schema";

export const authApi = {
  login: async (data: LoginData) => {
    const res = await apiRequest("POST", "/api/auth/login", data);
    return res.json();
  },

  register: async (data: RegisterData) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    return res.json();
  },

  getProfile: async () => {
    const res = await apiRequest("GET", "/api/auth/me");
    return res.json();
  }
};

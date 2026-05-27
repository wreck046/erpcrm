import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Global response interceptor - handles throttling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      toast.error("Too many requests, please slow down", {
        description: retryAfter ? `Try again in ${retryAfter}s` : "Please wait a moment",
      });
    }
    return Promise.reject(error);
  }
);

export default api;

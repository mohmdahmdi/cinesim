import cookieManager from "@/utils/cookieManager";
import localStorageManager from "@/utils/localStorageManager";
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const headers = {
  "Content-type": "application/json",
};

const instance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers,
  timeout: 10000,
});

const getToken = (): string | null => {
  return cookieManager.get("authToken") || localStorageManager.get("authToken");
};

const applyRequestInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Skip auth for auth endpoints
      if (config.url?.includes("/auth/")) {
        return config;
      }

      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );
};

interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

const applyResponseInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const data = error.response?.data as ApiError;

      switch (status) {
        case 401:
          cookieManager.remove("authToken");
          localStorageManager.remove("authToken");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          break;

        case 400:
        case 403:
        case 500:
          console.error(`Error ${status}:`, data?.message || error.message);
          break;

        default:
          console.error("Request failed:", error.message);
      }

      return Promise.reject(error);
    }
  );
};

applyRequestInterceptor(instance);
applyResponseInterceptor(instance);

export default instance;

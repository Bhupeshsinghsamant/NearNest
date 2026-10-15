import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "lc_auth_token";

export function getBaseUrl(): string {
  // Try to determine the host IP from Expo bundler automatically
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:5000/api/v1`;
  }
  // Fallback for Android emulator
  return "http://10.0.2.2:5000/api/v1";
}

export function getServerRoot(): string {
  const base = getBaseUrl();
  return base.replace(/\/api\/v1\/?$/, "");
}

export function getMediaUrl(item?: any): string {
  if (!item) return "";
  const rawUrl = typeof item === "string" ? item : (item.url || "");
  if (!rawUrl) return "";
  if (
    rawUrl.startsWith("http://") ||
    rawUrl.startsWith("https://") ||
    rawUrl.startsWith("data:") ||
    rawUrl.startsWith("file://")
  ) {
    return rawUrl;
  }
  const root = getServerRoot();
  const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${root}${normalizedPath}`;
}

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach stored JWT to outgoing requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("Error reading token from SecureStore:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

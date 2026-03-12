/**
 * API Utilities for Frontend
 * Include this file in your frontend components to interact with the backend API
 * 
 * Usage:
 * import { apiCall, login, register, logout } from '@/lib/api'
 * 
 * const user = await login(email, password)
 * const designs = await getDesigns(token)
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Base API call function with error handling
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<ApiResponse<T>> {
  try {
    const { token, ...fetchOptions } = options;

    // build headers object; HeadersInit cannot be indexed directly, so use a temporary
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string> | {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // cast back to HeadersInit for fetch
    const finalHeaders: HeadersInit = headers;

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || `HTTP Error: ${response.status}`,
      };
    }

    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * User Authentication
 */

export async function register(
  name: string,
  email: string,
  password: string
): Promise<ApiResponse<{ user: any; token: string }>> {
  return apiCall("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<{ user: any; token: string }>> {
  return apiCall("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(token: string): Promise<ApiResponse<any>> {
  return apiCall("/api/auth/logout", {
    method: "POST",
    token,
  });
}

export async function getCurrentUser(token: string): Promise<ApiResponse<{ user: any }>> {
  return apiCall("/api/auth/me", { token });
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<any>> {
  return apiCall("/api/auth/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * User Profile
 */

export async function getProfile(token: string): Promise<ApiResponse<{ user: any }>> {
  return apiCall("/api/profile", { token });
}

export async function updateProfile(
  token: string,
  data: { name?: string; email?: string; profilePhoto?: string; removePhoto?: boolean }
): Promise<ApiResponse<{ user: any }>> {
  return apiCall("/api/profile", {
    method: "PUT",
    token,
    body: JSON.stringify(data),
  });
}

/**
 * Design Management
 */

export async function getDesigns(token?: string): Promise<ApiResponse<{ designs: any[] }>> {
  return apiCall("/api/designs", { token });
}

export async function getDesign(id: string, token?: string): Promise<ApiResponse<{ design: any }>> {
  return apiCall(`/api/designs/${id}`, { token });
}

// alias for readability
export const getDesignById = getDesign;

export async function createDesign(
  name: string,
  designData: {
    room: any;
    furniture?: any[];
  },
  token?: string,
): Promise<ApiResponse<{ design: any }>> {
  return apiCall("/api/designs", {
    method: "POST",
    token,
    body: JSON.stringify({ name, room: designData.room, furniture: designData.furniture }),
  });
}

export async function updateDesign(
  id: string,
  name: string,
  designData: {
    room?: any;
    furniture?: any[];
  },
  token?: string,
): Promise<ApiResponse<{ design: any }>> {
  return apiCall(`/api/designs/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ name, ...designData }),
  });
}

export async function deleteDesign(
  id: string,
  token?: string,
): Promise<ApiResponse<{ message: string; design: any }>> {
  return apiCall(`/api/designs/${id}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Helper function to save token to storage
 */
export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("furnivision_token", token);
  }
}

/**
 * Helper function to get token from storage
 */
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("furnivision_token");
  }
  return null;
}

/**
 * Helper function to clear token from storage
 */
export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("furnivision_token");
  }
}

/**
 * Example usage in a component:
 * 
 * import { login, saveToken, getToken } from '@/lib/api'
 * 
 * export default function LoginPage() {
 *   const handleLogin = async (email: string, password: string) => {
 *     const result = await login(email, password)
 *     if (result.error) {
 *       console.error(result.error)
 *       return
 *     }
 *     saveToken(result.data!.token)
 *     // redirect to dashboard
 *   }
 *   
 *   return (
 *     // form content
 *   )
 * }
 */

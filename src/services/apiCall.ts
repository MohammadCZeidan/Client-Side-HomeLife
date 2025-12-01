import axios, { type AxiosRequestConfig, AxiosError } from 'axios';

// Shared API call utility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v0.1';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export async function apiCall<T>(
  endpoint: string,
  options: AxiosRequestConfig & { body?: string } = {}
): Promise<T> {
  try {
    // Convert fetch-style 'body' to axios 'data'
    // If body is a string (JSON.stringify result), parse it; otherwise use as-is
    let requestData = options.data;
    if (options.body) {
      try {
        requestData = JSON.parse(options.body);
      } catch {
        // If parsing fails, use body as-is (shouldn't happen with JSON.stringify)
        requestData = options.body;
      }
    }

    const response = await axiosInstance({
      url: endpoint,
      method: options.method || 'GET',
      data: requestData,
      params: options.params,
      headers: {
        ...options.headers,
      },
    });

    // Handle non-JSON responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const data = response.data;
    
    // Handle Laravel response wrapper: { status: "success", payload: {...} }
    // If payload exists, return it; otherwise return the whole response
    if (data && typeof data === 'object' && 'payload' in data) {
      return data.payload as T;
    }
    
    return data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        message?: string;
        errors?: Record<string, string[]>;
      }>;
      
      // Handle Laravel validation errors
      let errorMessage = axiosError.response?.data?.message || 
                        axiosError.message || 
                        `API Error: ${axiosError.response?.statusText || 'Unknown error'}`;
      
      // Extract validation errors if present
      if (axiosError.response?.data?.errors && typeof axiosError.response.data.errors === 'object') {
        const validationErrors = Object.values(axiosError.response.data.errors).flat();
        if (validationErrors.length > 0) {
          errorMessage = Array.isArray(validationErrors) 
            ? validationErrors.join(', ') 
            : String(validationErrors);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    throw error;
  }
}

export { API_BASE_URL };


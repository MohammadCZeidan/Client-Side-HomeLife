import axios, { type AxiosRequestConfig, AxiosError } from 'axios';

// Base URL for API calls - defaults to localhost if env var isn't set
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v0.1';

// Setting up axios with default headers
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-add auth token to every request if it exists in localStorage
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
    // Had to support both 'body' (from old fetch code) and 'data' (axios style)
    // If body is a JSON string, parse it first
    let requestData = options.data;
    if (options.body) {
      try {
        requestData = JSON.parse(options.body);
      } catch {
        // If parsing fails, just use it as-is (shouldn't happen but just in case)
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

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const data = response.data;
    
    // Laravel wraps responses in { status: "success", payload: {...} }
    // Extract payload if it exists, otherwise return the whole thing
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
      
      // Try to get a useful error message
      let errorMessage = axiosError.response?.data?.message || 
                        axiosError.message || 
                        `API Error: ${axiosError.response?.statusText || 'Unknown error'}`;
      
      // Laravel validation errors come as an object with field names
      // Flatten them into a single message
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


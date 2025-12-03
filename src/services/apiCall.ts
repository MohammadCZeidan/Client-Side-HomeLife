// Axios library for making HTTP requests
import axios, { type AxiosRequestConfig, AxiosError } from 'axios';

// Base URL for API calls - reads from environment variable or defaults to localhost
// VITE_API_URL can be set in .env file for different environments (dev, staging, prod)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v0.1';

// Create axios instance with default configuration for all API calls
const axiosInstance = axios.create({
  // Base URL prepended to all endpoint paths
  baseURL: API_BASE_URL,
  // Default headers sent with every request
  headers: {
    'Content-Type': 'application/json', // Indicates JSON request body
  },
});

// Request interceptor - runs before every API request
// Automatically adds authentication token to request headers if available
axiosInstance.interceptors.request.use(
  (config) => {
    // Get authentication token from browser localStorage
    const token = localStorage.getItem('auth_token');
    // If token exists, add it to Authorization header as Bearer token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Return modified config to proceed with request
    return config;
  },
  (error) => {
    // If interceptor fails, reject the promise with the error
    return Promise.reject(error);
  }
);

// Generic API call function that handles all HTTP requests to the backend
// Type parameter T allows TypeScript to infer the return type
export async function apiCall<T>(
  // API endpoint path (relative to base URL)
  endpoint: string,
  // Request options including method, body, params, headers
  options: AxiosRequestConfig & { body?: string } = {}
): Promise<T> {
  try {
    // Support both 'body' (legacy fetch API style) and 'data' (axios style)
    // Start with axios-style data if provided
    let requestData = options.data;
    // If body is provided (legacy format), parse it
    if (options.body) {
      try {
        // Parse JSON string to object if body is a string
        requestData = JSON.parse(options.body);
      } catch {
        // If parsing fails, use body as-is (shouldn't happen but handles edge cases)
        requestData = options.body;
      }
    }

    // Make HTTP request using axios instance
    const response = await axiosInstance({
      // Endpoint path (will be combined with baseURL)
      url: endpoint,
      // HTTP method (GET, POST, PUT, DELETE, etc.) - defaults to GET
      method: options.method || 'GET',
      // Request body data (for POST, PUT, PATCH requests)
      data: requestData,
      // URL query parameters (for GET requests)
      params: options.params,
      // Additional headers (merged with default headers)
      headers: {
        ...options.headers,
      },
    });

    // Handle empty responses (like 204 No Content from DELETE requests)
    if (response.status === 204) {
      // Return empty object typed as T for successful empty responses
      return {} as T;
    }

    // Extract response data from axios response object
    const data = response.data;
    
    // Laravel backend wraps successful responses in { status: "success", payload: {...} }
    // Extract payload if it exists, otherwise return the whole response
    if (data && typeof data === 'object' && 'payload' in data) {
      return data.payload as T;
    }
    
    // Return data as-is if not wrapped in payload
    return data as T;
  } catch (error) {
    // Handle axios-specific errors
    if (axios.isAxiosError(error)) {
      // Type assertion for axios error with Laravel error structure
      const axiosError = error as AxiosError<{
        message?: string; // General error message
        errors?: Record<string, string[]>; // Validation errors by field name
      }>;
      
      // Try to extract a useful error message from various possible locations
      let errorMessage = axiosError.response?.data?.message || // Server error message
                        axiosError.message || // Axios error message
                        `API Error: ${axiosError.response?.statusText || 'Unknown error'}`; // HTTP status text
      
      // Laravel validation errors come as an object with field names as keys
      // Flatten them into a single comma-separated message
      if (axiosError.response?.data?.errors && typeof axiosError.response.data.errors === 'object') {
        // Extract all error messages from all fields and flatten into array
        const validationErrors = Object.values(axiosError.response.data.errors).flat();
        // If validation errors exist, use them as the error message
        if (validationErrors.length > 0) {
          errorMessage = Array.isArray(validationErrors) 
            ? validationErrors.join(', ') // Join multiple errors with commas
            : String(validationErrors);
        }
      }
      
      // Throw new Error with extracted message
      throw new Error(errorMessage);
    }
    
    // If error is not an axios error, re-throw it as-is
    throw error;
  }
}

// Export API base URL for use in other modules if needed
export { API_BASE_URL };


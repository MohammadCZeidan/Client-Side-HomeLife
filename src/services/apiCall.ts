// Shared API call utility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v0.1';

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle non-JSON responses (like 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    // Handle Laravel validation errors
    let errorMessage = errorData.message || `API Error: ${response.statusText}`;
    
    // Extract validation errors if present
    if (errorData.errors && typeof errorData.errors === 'object') {
      const validationErrors = Object.values(errorData.errors).flat();
      if (validationErrors.length > 0) {
        errorMessage = Array.isArray(validationErrors) 
          ? validationErrors.join(', ') 
          : String(validationErrors);
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  // Handle Laravel response wrapper: { status: "success", payload: {...} }
  // If payload exists, return it; otherwise return the whole response
  if (data && typeof data === 'object' && 'payload' in data) {
    return data.payload as T;
  }
  
  return data as T;
}

export { API_BASE_URL };


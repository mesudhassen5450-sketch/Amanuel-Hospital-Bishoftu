const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

let isHandlingUnauthorized = false;

export function getAuthToken(): string | null {
  return localStorage.getItem("token") || localStorage.getItem("auth_token");
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function handleUnauthorized(): void {
  if (isHandlingUnauthorized) return;
  if (window.location.pathname === "/staff/login") return;

  isHandlingUnauthorized = true;
  localStorage.removeItem("token");
  localStorage.removeItem("auth_token");
  sessionStorage.removeItem("staff_session");
  
  // Use replace to prevent back button from returning to protected page
  window.location.replace("/staff/login");
  
  // Reset flag after a delay to allow future 401 handling
  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, 1000);
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  // Debug logging for authentication
  if (path.includes('/staff') && !path.includes('/login')) {
    console.log('[API Request]', {
      path,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
    });
  }
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 && !path.includes("/auth/login") && !path.includes("/password")) {
    handleUnauthorized();
  }

  return response;
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    // Enhanced error logging for debugging
    console.error('[API Error]', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      error: data.error || data.message,
      data
    });
    
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

import { QueryClient, QueryFunction } from "@tanstack/react-query";

// 강제 로그아웃을 위한 글로벌 핸들러
let globalLogoutHandler: (() => void) | null = null;

export const setGlobalLogoutHandler = (handler: () => void) => {
  globalLogoutHandler = handler;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      errorData = { error: res.statusText };
    }
    
    // 강제 로그아웃이 필요한 경우 처리
    if (errorData.forceLogout && globalLogoutHandler) {
      globalLogoutHandler();
    }
    
    const text = errorData.error || errorData.message || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // 응답이 성공이고 forceLogout이 있으면 처리
  if (res.ok) {
    try {
      const responseData = await res.clone().json();
      if (responseData.forceLogout && globalLogoutHandler) {
        globalLogoutHandler();
      }
    } catch {
      // JSON이 아닌 응답인 경우 무시
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

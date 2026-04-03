import createClient from "openapi-fetch";
import type { paths, components } from "../types/api.ts";
export type { paths, components };
import { useAuthStore } from "@/stores/auth.ts";
import { useToastStore } from '@/stores/toast';
import i18next from "./i18n.ts";
import { normalizeFrontendStoredLocale } from '@/i18n/locale-adapter';
import { errorsByResourceLocale } from '@/i18n/bundles/errors';

// DEV: Empty baseUrl routes through Vite proxy, consistent with WebSocket, solves CORS
export const BASE_URL = "";

const rawClient = createClient<paths>({
  baseUrl: BASE_URL
});

export type ClientResult<TData = Record<string, unknown>, TError = Record<string, unknown>> = {
  data?: TData;
  error?: TError;
  response?: Response;
};

type ClientMethod = <TData = Record<string, unknown>, TError = Record<string, unknown>>(
  path: string,
  init?: Record<string, unknown>,
) => Promise<ClientResult<TData, TError>>;

interface LooseClient {
  use: (middleware: Record<string, unknown>) => void;
  GET: ClientMethod;
  POST: ClientMethod;
  PUT: ClientMethod;
  DELETE: ClientMethod;
  PATCH: ClientMethod;
  HEAD: ClientMethod;
  OPTIONS: ClientMethod;
}

export const client: LooseClient = rawClient as unknown as LooseClient;

function getOrCreateClientId() {
  if (typeof document === 'undefined') return 'server';
  let clientId = document.cookie.match(/client_id=([^;]+)/)?.[1];
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `client_id=${clientId}; expires=${expires}; path=/; SameSite=Lax`;
  }
  return clientId;
}

const clientId = getOrCreateClientId();
const retryRequestCache = new WeakMap<Request, Request>();

const consumeRetryRequest = (request: Request): Request => {
  const cached = retryRequestCache.get(request);
  if (cached) {
    retryRequestCache.delete(request);
    return cached;
  }

  try {
    return request.clone();
  } catch {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return new Request(request.url, { method: request.method, headers: request.headers });
    }
    throw new Error("Retry request body already used");
  }
};

const waitForHydration = () => {
  return new Promise<void>((resolve) => {
    const start = Date.now();
    const check = () => {
      if (useAuthStore.getState()._hasHydrated || (Date.now() - start > 2000)) {
        resolve();
      } else {
        setTimeout(check, 20);
      }
    };
    check();
  });
};

// Common response structures
export interface BaseResponse<T = unknown> {
  success: boolean;
  code: number;
  biz_code?: string | null;
  msg: string;
  data: T;
}

export interface ApiError {
  success: false;
  code: number;
  biz_code?: string | null;
  msg: string;
}

const hasMessageField = (value: unknown): value is { msg?: string } => {
  return typeof value === 'object' && value !== null && 'msg' in value;
};

/**
 * Type Guard: Check if object is an ApiError
 */
export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'success' in err &&
    (err as ApiError).success === false &&
    'code' in err
  );
}

export interface PaginationInfo {
  total: number;
  total_pages: number;
  page: number;
  page_size: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination?: PaginationInfo;
  total?: number; // Compatible with legacy total field
}

export interface CaptchaPolicyRequest {
  scene: string;
  risk_target?: string;
  risk_target_type?: "identifier" | "email" | "phone";
  risk_user_id?: string;
}

export function whenDefined<K extends string, V>(
  key: K,
  value: V | null | undefined,
): Partial<Record<K, V>> {
  if (value === null || value === undefined) {
    return {};
  }
  return { [key]: value } as Partial<Record<K, V>>;
}

export function whenNonEmptyString<K extends string>(
  key: K,
  value: string | null | undefined,
): Partial<Record<K, string>> {
  if (!value) {
    return {};
  }
  return { [key]: value } as Partial<Record<K, string>>;
}

export interface CaptchaPolicyResponse {
  require_captcha: boolean;
  deny_request: boolean;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  difficulty: "Easy" | "Medium" | "Hard";
}

/**
 * Helper: Safely extract API data and handle errors
 */
export async function extractData<T>(
  promise: Promise<ClientResult<unknown, unknown>>
): Promise<T> {
  const { data, error, response } = await promise;
  
  if (error) {
    if (isApiError(error)) throw error;
    // Special handling for raw error objects captured by openapi-fetch
    const errorMsg = hasMessageField(error)
      ? (error.msg ?? "API Error")
      : (error instanceof Error ? error.message : "API Error");
    throw new Error(errorMsg);
  }

  if (response && response.status === 401) {
    throw new Error("Unauthorized (401)");
  }

  if (!data) throw new Error("No response data");

  // Core logic: If it's BaseResponse format (contains success and data fields)
  if (typeof data === 'object' && data !== null && 'success' in data && 'data' in data) {
    const rec = data as Record<string, unknown>;
    if (rec['success'] === false) {
      if (isApiError(data)) throw data;
      const code = typeof rec['code'] === 'number' ? rec['code'] : 500;
      const bizCode =
        typeof rec['biz_code'] === 'string' || rec['biz_code'] === null ? (rec['biz_code'] as string | null) : null;
      const msg = typeof rec['msg'] === 'string' ? rec['msg'] : 'API Error';
      throw { success: false, code, biz_code: bizCode, msg } satisfies ApiError;
    }
    // Return internal data content and cast to T
    return rec['data'] as T;
  }

  // Edge case: Backend may directly return data (e.g. boolean or raw string)
  // If data itself is the target T (e.g. data.users structure inferred as root object by openapi)
  return data as T;
}

/**
 * Standardized error formatting for components
 */
export function handleApiError(e: unknown, t: (key: string) => string): string {
  if (isApiError(e)) {
    return e['msg'] || t('errors.INTERNAL_ERROR');
  }
  return e instanceof Error ? e.message : t('errors.INTERNAL_ERROR');
}

export async function postCaptchaPolicy(request: CaptchaPolicyRequest): Promise<CaptchaPolicyResponse> {
  const { currentUserData } = useAuthStore.getState();
  const response = await fetch(`${BASE_URL}/api/v1/users/public/captcha/policy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
      ...(currentUserData?.access_token ? { Authorization: `Bearer ${currentUserData.access_token}` } : {}),
    },
    body: JSON.stringify(request),
  });

  const parsedUnknown: unknown = await response.json().catch((): null => null);
  const parsed = parsedUnknown as BaseResponse<CaptchaPolicyResponse> | ApiError | null;
  if (!parsed) {
    throw new Error("Invalid response");
  }
  if (isApiError(parsed)) {
    throw parsed;
  }
  if (!parsed.success) {
    throw {
      success: false,
      code: parsed.code,
      biz_code: parsed.biz_code,
      msg: parsed.msg,
    } as ApiError;
  }
  return parsed.data;
}

// Refresh status management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Silent Refresh Core Logic
 */
const refreshTokenAction = async () => {
  const { currentUserData, updateTokens, logout } = useAuthStore.getState();
  if (!currentUserData?.refresh_token) {
    throw new Error("No refresh token available");
  }

  try {
    const response = await fetch(`${BASE_URL}/api/v1/users/public/refresh-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Client-Id': clientId 
      },
      body: JSON.stringify({ refresh_token: currentUserData.refresh_token })
    });

    const data: unknown = await response.json().catch((): null => null);
    if (typeof data !== 'object' || data === null) {
      throw new Error('Refresh failed');
    }
    const rec = data as Record<string, unknown>;
    const success = rec['success'] === true;
    const msg = typeof rec['msg'] === 'string' ? rec['msg'] : 'Refresh failed';
    const dataObj = typeof rec['data'] === 'object' && rec['data'] !== null ? (rec['data'] as Record<string, unknown>) : null;
    const tokens = dataObj && typeof dataObj['tokens'] === 'object' && dataObj['tokens'] !== null
      ? (dataObj['tokens'] as Record<string, unknown>)
      : null;
    const accessToken = tokens && typeof tokens['access_token'] === 'string' ? tokens['access_token'] : null;
    const refreshToken = tokens && typeof tokens['refresh_token'] === 'string' ? tokens['refresh_token'] : null;

    if (success && accessToken && refreshToken) {
      updateTokens(accessToken, refreshToken);
      return accessToken;
    }

    throw new Error(msg);
  } catch (error) {
    // Refresh token also invalid, logout user
    logout();
    if (typeof window !== 'undefined') {
      window.location.hash = "mod=public&page=login&reason=session_expired";
    }
    throw error;
  }
};

client.use({
  async onRequest({ request }: { request: Request }) {
    await waitForHydration();
    const { currentUserData } = useAuthStore.getState();
    request.headers.set("X-Client-Id", clientId);
    if (currentUserData?.access_token) {
      request.headers.set("Authorization", `Bearer ${currentUserData.access_token}`);
    }
    // Cache retryable request to avoid clone failure after 401 refresh
    try {
      retryRequestCache.set(request, request.clone());
    } catch {
      // No-op for bodyless requests
    }
    return request;
  },

  async onResponse({
    response,
    request,
  }: {
    response: Response;
    request: Request;
  }) {
    // Handle 401 and not login/refresh endpoint
    if (response.status === 401 && 
        !request.url.includes('/refresh-token') && 
        !request.url.includes('/login')) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          request.headers.set("Authorization", `Bearer ${token}`);
          const retryRequest = consumeRetryRequest(request);
          retryRequest.headers.set("Authorization", `Bearer ${token}`);
          return fetch(retryRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true;

      return new Promise((resolve, reject) => {
        refreshTokenAction()
          .then((token) => {
            request.headers.set("Authorization", `Bearer ${token}`);
            processQueue(null, token);
            const retryRequest = consumeRetryRequest(request);
            retryRequest.headers.set("Authorization", `Bearer ${token}`);
            resolve(fetch(retryRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    // Error handling logic
    if (!response.ok) {
      // 401 handled above
      if (response.status === 401) return response;

      // Allow suppressing automatic toast via header
      if (request.headers.get("X-No-Toast") === "true") return response;

      const clone = response.clone();
      const parsed: unknown = await clone.json().catch((): null => null);
      const rec = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
      const msg = typeof rec['msg'] === 'string' ? rec['msg'] : undefined;
      const bizCode = typeof rec['biz_code'] === 'string' ? rec['biz_code'] : undefined;
      const { addToast } = useToastStore.getState();
      
      let errorMsg = msg || response.statusText || "Network Error";
      if (bizCode) {
        const locale = normalizeFrontendStoredLocale(i18next.resolvedLanguage) || 'en';
        const translated = (errorsByResourceLocale[locale] as Record<string, string>)[bizCode];
        if (translated) {
          errorMsg = translated;
        }
      }
      
      addToast(errorMsg, "error");
    }
    return response;
  },
});

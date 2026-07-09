import { errorMessages } from "@/lib/errorMessages";

type ApiErrorLike = {
  status?: number;
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    } | string;
  };
  message?: string;
};

function extractMessage(error: ApiErrorLike) {
  const responseData = error.response?.data;

  if (responseData && typeof responseData === "object") {
    return responseData.message || responseData.error || "";
  }

  if (typeof responseData === "string") {
    return responseData;
  }

  return error.message || "";
}

export function getFriendlyApiErrorMessage(error: unknown, fallback = errorMessages.generic) {
  const apiError = (error ?? {}) as ApiErrorLike;
  const status = Number(apiError.status || apiError.response?.status || 0);
  const rawMessage = extractMessage(apiError);
  const normalized = `${rawMessage} ${apiError.message || ""}`.toLowerCase();

  if (status === 401 || normalized.includes("401") || normalized.includes("unauthorized")) {
    return errorMessages.login401;
  }

  if (status === 429 || normalized.includes("429") || normalized.includes("too many requests") || normalized.includes("muchas solicitudes")) {
    return errorMessages.rateLimited;
  }

  if (status >= 500 || normalized.includes("500") || normalized.includes("internal server error")) {
    return errorMessages.login500;
  }

  return rawMessage || fallback;
}

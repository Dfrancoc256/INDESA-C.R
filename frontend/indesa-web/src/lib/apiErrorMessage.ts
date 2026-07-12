import { errorMessages } from "@/lib/errorMessages";

type ApiErrorLike = {
  status?: number;
  data?: {
    message?: string;
    error?: string;
  } | string;
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
  if (error.data && typeof error.data === "object") {
    return error.data.message || error.data.error || "";
  }

  if (typeof error.data === "string") {
    return error.data;
  }

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
    return errorMessages.sessionExpired;
  }

  if (status === 403 || normalized.includes("403") || normalized.includes("forbidden")) {
    return errorMessages.forbidden;
  }

  if (status === 404 || normalized.includes("404") || normalized.includes("not found")) {
    return errorMessages.notFound;
  }

  if (status === 409 || normalized.includes("409") || normalized.includes("conflict")) {
    return rawMessage || errorMessages.conflict;
  }

  if (status === 413 || normalized.includes("413") || normalized.includes("payload too large")) {
    return errorMessages.fileTooLarge;
  }

  if (status === 422 || normalized.includes("422") || normalized.includes("validation")) {
    return rawMessage || errorMessages.validation;
  }

  if (status === 429 || normalized.includes("429") || normalized.includes("too many requests") || normalized.includes("muchas solicitudes")) {
    return errorMessages.rateLimited;
  }

  if (status >= 500 || normalized.includes("500") || normalized.includes("internal server error")) {
    return errorMessages.login500;
  }

  return rawMessage || fallback;
}

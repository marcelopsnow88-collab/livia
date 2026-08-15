export type AppErrorCode =
  | "VALIDATION"
  | "AUTH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DATABASE"
  | "EXTERNAL_API"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "UNKNOWN";

export class AppError extends Error {
  constructor(
    message: string,
    public code: AppErrorCode = "UNKNOWN",
    public cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toAppError(error: unknown, fallback = "Erro inesperado."): AppError {
  if (error instanceof AppError) return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    if (msg.includes("JWT") || msg.includes("auth")) {
      return new AppError("Sessão expirada ou inválida.", "AUTH", error);
    }
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return new AppError("Registro duplicado.", "VALIDATION", error);
    }
    return new AppError(msg, "DATABASE", error);
  }
  return new AppError(fallback, "UNKNOWN", error);
}

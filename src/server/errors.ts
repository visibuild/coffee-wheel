export type AppErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "AppError";
  }
}

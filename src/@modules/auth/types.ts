export interface AuthUser { id: string; displayName: string; email: string; }
export type AuthStatus = "loading" | "ready" | "error";

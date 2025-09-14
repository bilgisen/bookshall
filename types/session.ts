// Define the session types based on Better Auth's session management
export interface SessionUser {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface SessionData {
  user: SessionUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

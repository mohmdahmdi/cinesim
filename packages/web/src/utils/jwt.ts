export interface JwtPayload {
  sub: string;
  username: string;
  role: "user" | "admin";
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as JwtPayload;
  } catch {
    return null;
  }
}

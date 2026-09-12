import instance from "@/lib/AxiosConfig";

export type AuthSession = {
  accessToken: string;
  user: { username: string; role: "user" | "admin" };
};

export async function registerRequest(payload: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthSession> {
  const { data } = await instance.post("/auth/register", payload);
  return data;
}

export async function loginRequest(payload: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const { data } = await instance.post("/auth/login", payload);
  return data;
}

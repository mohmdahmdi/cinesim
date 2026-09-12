import instance from "@/lib/AxiosConfig";

export type PublicProfile = {
  username: string;
  reputationScore: number;
  tier: string;
  suggestionsCount: number;
  votesCount: number;
  memberSince: string;
};

export async function getProfile(username: string): Promise<PublicProfile> {
  const { data } = await instance.get(`/users/${username}`);
  return data;
}

export async function getLeaderboard(): Promise<PublicProfile[]> {
  const { data } = await instance.get("/users/leaderboard");
  return data;
}

import instance from "@/lib/AxiosConfig";
import { Movie } from "./movies";

export type VoteResult = {
  similarityId: string;
  agreeCount: number;
  disagreeCount: number;
  score: number;
  label: string;
  myVote: "agree" | "disagree" | null;
};

export type UserSuggestion = {
  similarityId: string;
  movieLow: Movie;
  movieHigh: Movie;
  agreeCount: number;
  disagreeCount: number;
  label: string;
  createdAt: string;
};

export async function voteSimilarity(
  similarityId: string,
  vote: "agree" | "disagree"
): Promise<VoteResult> {
  const { data } = await instance.post(`/similarities/${similarityId}/vote`, { vote });
  return data;
}

export async function retractVote(similarityId: string): Promise<VoteResult> {
  const { data } = await instance.delete(`/similarities/${similarityId}/vote`);
  return data;
}

export async function deleteSimilarity(similarityId: string): Promise<void> {
  await instance.delete(`/similarities/${similarityId}`);
}

export async function getSuggestionsByUsername(username: string): Promise<UserSuggestion[]> {
  const { data } = await instance.get(`/similarities/by-user/${username}`);
  return data;
}

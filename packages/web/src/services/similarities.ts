import instance from "@/lib/AxiosConfig";
import { Movie } from "./movies";

export const SIMILARITY_REASONS = [
  "story",
  "themes",
  "characters",
  "atmosphere",
  "visual_style",
  "genre",
  "tone",
  "pacing",
  "world_building",
  "emotional_experience",
  "concept",
  "ending",
  "overall_feeling",
] as const;

export type SimilarityReason = (typeof SIMILARITY_REASONS)[number];

export const REASON_LABELS: Record<SimilarityReason, string> = {
  story: "Story",
  themes: "Themes",
  characters: "Characters",
  atmosphere: "Atmosphere",
  visual_style: "Visual style",
  genre: "Genre",
  tone: "Tone",
  pacing: "Pacing",
  world_building: "World-building",
  emotional_experience: "Emotional experience",
  concept: "Concept or ideas",
  ending: "Ending",
  overall_feeling: "Overall feeling",
};

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

export type ReasonBreakdown = {
  respondents: number;
  breakdown: { reason: SimilarityReason; count: number; percentage: number }[];
  myReasons: SimilarityReason[];
};

export type CommentItem = {
  id: string;
  body: string;
  deleted: boolean;
  username: string | null;
  agreeCount: number;
  disagreeCount: number;
  score: number;
  myVote: "agree" | "disagree" | null;
  isMine: boolean;
  createdAt: string;
  replies: CommentItem[];
};

export type EdgeSummary = {
  similarityId: string;
  agreeCount: number;
  disagreeCount: number;
  score: number;
  label: string;
  myVote: "agree" | "disagree" | null;
  isMine: boolean;
};

export type CompareResult = {
  edge: EdgeSummary | null;
  reasons: ReasonBreakdown;
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

export async function getReasonsBreakdown(similarityId: string): Promise<ReasonBreakdown> {
  const { data } = await instance.get(`/similarities/${similarityId}/reasons`);
  return data;
}

export async function setReasons(
  similarityId: string,
  reasons: SimilarityReason[]
): Promise<ReasonBreakdown> {
  const { data } = await instance.put(`/similarities/${similarityId}/reasons`, { reasons });
  return data;
}

export async function getComments(similarityId: string): Promise<CommentItem[]> {
  const { data } = await instance.get(`/similarities/${similarityId}/comments`);
  return data;
}

export async function addComment(
  similarityId: string,
  body: string,
  parentCommentId?: string
): Promise<CommentItem> {
  const { data } = await instance.post(`/similarities/${similarityId}/comments`, {
    body,
    parentCommentId,
  });
  return data;
}

export async function voteComment(commentId: string, vote: "agree" | "disagree") {
  const { data } = await instance.post(`/comments/${commentId}/vote`, { vote });
  return data as { commentId: string; agreeCount: number; disagreeCount: number; score: number; myVote: "agree" | "disagree" };
}

export async function retractCommentVote(commentId: string) {
  const { data } = await instance.delete(`/comments/${commentId}/vote`);
  return data as { commentId: string; agreeCount: number; disagreeCount: number; score: number; myVote: null };
}

export async function deleteComment(commentId: string): Promise<void> {
  await instance.delete(`/comments/${commentId}`);
}

export async function compareMovies(aTmdbId: number, bTmdbId: number): Promise<CompareResult> {
  const { data } = await instance.get(`/similarities/compare`, { params: { a: aTmdbId, b: bTmdbId } });
  return data;
}

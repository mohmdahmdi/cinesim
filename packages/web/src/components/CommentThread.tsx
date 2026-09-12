"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  addComment,
  CommentItem as CommentItemType,
  deleteComment,
  getComments,
  retractCommentVote,
  voteComment,
} from "@/services/similarities";
import { useAuth } from "@/providers/AuthProvider";
import { errorMessage } from "@/utils/toasts";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CommentRow({
  comment,
  similarityId,
  isReply,
}: {
  comment: CommentItemType;
  similarityId: string;
  isReply?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["comments", similarityId];
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const voteMutation = useMutation({
    mutationFn: (vote: "agree" | "disagree") => voteComment(comment.id, vote),
    onSuccess: invalidate,
    onError: () => errorMessage("Couldn't register that. Please try again."),
  });

  const retractMutation = useMutation({
    mutationFn: () => retractCommentVote(comment.id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: invalidate,
    onError: () => errorMessage("Couldn't delete that comment."),
  });

  const replyMutation = useMutation({
    mutationFn: () => addComment(similarityId, replyBody, comment.id),
    onSuccess: () => {
      setReplyBody("");
      setShowReply(false);
      invalidate();
    },
    onError: () => errorMessage("Couldn't post that reply."),
  });

  return (
    <div className={isReply ? "ml-6 border-l border-border pl-3" : ""}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          {comment.username ? (
            <Link href={`/u/${comment.username}`} className="font-medium text-foreground hover:text-accent">
              {comment.username}
            </Link>
          ) : (
            <span className="italic">deleted user</span>
          )}
          <span>· {timeAgo(comment.createdAt)}</span>
        </div>

        <p className={`mt-1 text-sm ${comment.deleted ? "italic text-muted" : "text-foreground/90"}`}>
          {comment.body}
        </p>

        {!comment.deleted && (
          <div className="mt-1.5 flex items-center gap-3 text-xs">
            <button
              type="button"
              disabled={voteMutation.isPending || retractMutation.isPending}
              onClick={() =>
                comment.myVote === "agree" ? retractMutation.mutate() : voteMutation.mutate("agree")
              }
              className={comment.myVote === "agree" ? "text-agree" : "text-muted hover:text-agree"}
            >
              Agree{comment.agreeCount > 0 ? ` (${comment.agreeCount})` : ""}
            </button>
            <button
              type="button"
              disabled={voteMutation.isPending || retractMutation.isPending}
              onClick={() =>
                comment.myVote === "disagree"
                  ? retractMutation.mutate()
                  : voteMutation.mutate("disagree")
              }
              className={comment.myVote === "disagree" ? "text-disagree" : "text-muted hover:text-disagree"}
            >
              Disagree{comment.disagreeCount > 0 ? ` (${comment.disagreeCount})` : ""}
            </button>
            {!isReply && user && (
              <button
                type="button"
                onClick={() => setShowReply((v) => !v)}
                className="text-muted hover:text-accent"
              >
                Reply
              </button>
            )}
            {comment.isMine && (
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm("Delete this comment?")) deleteMutation.mutate();
                }}
                className="text-muted hover:text-disagree"
              >
                Delete
              </button>
            )}
          </div>
        )}

        {showReply && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              className="flex-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              type="button"
              disabled={!replyBody.trim() || replyMutation.isPending}
              onClick={() => replyMutation.mutate()}
              className="rounded-full bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Post
            </button>
          </div>
        )}
      </div>

      {comment.replies.map((reply) => (
        <CommentRow key={reply.id} comment={reply} similarityId={similarityId} isReply />
      ))}
    </div>
  );
}

export default function CommentThread({ similarityId }: { similarityId: string }) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();
  const queryKey = ["comments", similarityId];

  const { data: comments = [] } = useQuery({
    queryKey,
    queryFn: () => getComments(similarityId),
  });

  const addMutation = useMutation({
    mutationFn: () => addComment(similarityId, newComment),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => errorMessage("Couldn't post that comment."),
  });

  return (
    <div>
      {user ? (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Do you think these are actually similar? Why or why not?"
            className="flex-1 rounded-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={!newComment.trim() || addMutation.isPending}
            onClick={() => addMutation.mutate()}
            className="rounded-full bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Post
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet. Start the discussion.</p>
      ) : (
        <div className="divide-y divide-border">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} similarityId={similarityId} />
          ))}
        </div>
      )}
    </div>
  );
}

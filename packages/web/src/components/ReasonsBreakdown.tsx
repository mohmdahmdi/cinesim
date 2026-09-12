"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getReasonsBreakdown,
  REASON_LABELS,
  setReasons,
  SimilarityReason,
} from "@/services/similarities";
import { useAuth } from "@/providers/AuthProvider";
import ReasonPicker from "./ReasonPicker";

export default function ReasonsBreakdown({ similarityId }: { similarityId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["reasons", similarityId];

  const { data } = useQuery({
    queryKey,
    queryFn: () => getReasonsBreakdown(similarityId),
  });

  const mutation = useMutation({
    mutationFn: (reasons: SimilarityReason[]) => setReasons(similarityId, reasons),
    onSuccess: (result) => queryClient.setQueryData(queryKey, result),
  });

  const toggleMyReason = (reason: SimilarityReason) => {
    const current = data?.myReasons ?? [];
    const next = current.includes(reason)
      ? current.filter((r) => r !== reason)
      : [...current, reason];
    mutation.mutate(next);
  };

  if (!data) return <p className="text-xs text-muted">Loading…</p>;

  return (
    <div>
      {data.breakdown.length === 0 ? (
        <p className="text-sm text-muted">No one has shared their reasons yet.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            Based on {data.respondents} {data.respondents === 1 ? "person" : "people"} who shared
            their reasons
          </p>
          <div className="flex flex-col gap-2">
            {data.breakdown.map((item) => (
              <div key={item.reason} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-foreground">{REASON_LABELS[item.reason]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-muted">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {user && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs text-muted">Add your own reasons (optional):</p>
          <ReasonPicker value={data.myReasons} onToggle={toggleMyReason} disabled={mutation.isPending} />
        </div>
      )}
    </div>
  );
}

import { REASON_LABELS, SIMILARITY_REASONS, SimilarityReason } from "@/services/similarities";

export default function ReasonPicker({
  value,
  onToggle,
  disabled,
}: {
  value: SimilarityReason[];
  onToggle: (reason: SimilarityReason) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SIMILARITY_REASONS.map((reason) => {
        const selected = value.includes(reason);
        return (
          <button
            key={reason}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(reason)}
            className={`rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
              selected
                ? "border-accent bg-accent/20 text-accent"
                : "border-border text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {REASON_LABELS[reason]}
          </button>
        );
      })}
    </div>
  );
}

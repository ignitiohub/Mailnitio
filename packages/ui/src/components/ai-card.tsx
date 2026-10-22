import { Wand2 } from "lucide-react";
import { cn } from "../lib/cn";
import { Card } from "./card";
import { ConfidenceBar } from "./confidence-bar";

/** AI decision summary. AI-generated content is always labelled "AI suggestion". */
export function AiCard({
  category,
  confidence,
  reason,
  replyType,
  model,
  cost,
  className,
}: {
  category: string;
  confidence: number;
  reason: string;
  replyType: string;
  model: string;
  /** Pre-formatted, e.g. "₦3.71". */
  cost: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-3 p-4", className)}>
      <p className="flex items-center gap-1.5 text-caption text-primary">
        <Wand2 aria-hidden className="size-3.5 stroke-[1.75]" />
        AI suggestion
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-overline text-text-subtle uppercase">Category</p>
        <p className="text-h4 text-text">{category}</p>
      </div>
      <ConfidenceBar value={confidence} />
      <p className="text-body text-text-muted">{reason}</p>
      <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-small">
        <div>
          <dt className="text-text-subtle">Reply type</dt>
          <dd className="text-text">{replyType}</dd>
        </div>
        <div>
          <dt className="text-text-subtle">Model and cost</dt>
          <dd className="text-caption font-normal text-text-muted">
            <span className="font-mono">{model}</span> · <span className="tabular">{cost}</span>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

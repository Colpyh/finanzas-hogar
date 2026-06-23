"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useHousehold } from "@/shared/hooks/use-household";
import { cn } from "@/lib/utils";

type View = "group" | "personal";

export function ViewTabs({ view }: { view: View }) {
  const router = useRouter();
  const params = useSearchParams();
  const household = useHousehold();

  function switchTo(v: View) {
    const next = new URLSearchParams(params.toString());
    if (v === "group") next.delete("view");
    else next.set("view", "personal");
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div
      className="inline-flex rounded-[11px] p-[3px] gap-[2px]"
      style={{
        background: "var(--muted)",
        border: "1px solid var(--border)",
      }}
    >
      {(
        [
          { value: "group" as const,    label: `👥 ${household.name}` },
          { value: "personal" as const, label: "🧍 Personal" },
        ] as const
      ).map(({ value, label }) => (
        <button
          key={value}
          onClick={() => switchTo(value)}
          className={cn(
            "text-[12.5px] font-bold px-[13px] py-[6px] rounded-[8px] border-none cursor-pointer transition-all duration-150",
            view === value
              ? "bg-card text-foreground shadow-sm"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

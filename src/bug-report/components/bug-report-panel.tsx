"use client";

import { useState, useTransition } from "react";
import { updateBugReportStatus } from "@/bug-report/actions";
import { CheckCircle, Circle } from "lucide-react";

type Report = {
  id: string;
  userEmail: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
};

export function BugReportPanel({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(id: string, current: string) {
    const next = current === "open" ? "resolved" : "open";
    startTransition(async () => {
      await updateBugReportStatus(id, next as "open" | "resolved");
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next } : r))
      );
    });
  }

  const open = reports.filter((r) => r.status === "open");
  const resolved = reports.filter((r) => r.status === "resolved");

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin reportes por ahora.</p>;
  }

  return (
    <div className="space-y-4">
      {[{ label: "Abiertos", items: open }, { label: "Resueltos", items: resolved }].map(
        ({ label, items }) =>
          items.length > 0 && (
            <div key={label} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              {items.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-xl border p-3 space-y-1 ${
                    r.status === "resolved"
                      ? "border-border opacity-60"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-tight">{r.title}</p>
                    <button
                      onClick={() => toggle(r.id, r.status)}
                      disabled={pending}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                      title={r.status === "open" ? "Marcar como resuelto" : "Reabrir"}
                    >
                      {r.status === "resolved" ? <CheckCircle size={16} className="text-green-500" /> : <Circle size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {r.userEmail} · {new Date(r.createdAt).toLocaleDateString("es-419")}
                  </p>
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}

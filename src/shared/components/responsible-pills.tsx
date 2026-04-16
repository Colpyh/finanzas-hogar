import { User } from "lucide-react";

type Member = { userId: string; displayName: string };

type Props = {
  members: Member[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
};

export function ResponsiblePills({ members, value, onChange, disabled }: Props) {
  if (members.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors disabled:opacity-50 ${
          value === null
            ? "bg-primary/10 border-primary/30 text-primary"
            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
        }`}
      >
        <User size={11} />
        Sin asignar
      </button>
      {members.map((m) => (
        <button
          key={m.userId}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m.userId)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors disabled:opacity-50 ${
            value === m.userId
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          {m.displayName.split(" ")[0]}
        </button>
      ))}
    </div>
  );
}

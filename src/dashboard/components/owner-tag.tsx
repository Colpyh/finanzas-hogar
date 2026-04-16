type Props = {
  responsibleId: string | null;
  currentUserId: string;
  memberNames: Record<string, string>;
  isShared?: boolean;
};

export function OwnerTag({ responsibleId, currentUserId, memberNames, isShared }: Props) {
  if (!currentUserId) return null;

  // Shared expense: cost is always split regardless of who physically pays
  if (isShared || responsibleId === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400 shrink-0">
        ÷2
      </span>
    );
  }

  if (responsibleId === currentUserId) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
        Mío
      </span>
    );
  }

  const name = memberNames[responsibleId];
  const label = name ? name.split(" ")[0] : "Otro";
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
      {label}
    </span>
  );
}

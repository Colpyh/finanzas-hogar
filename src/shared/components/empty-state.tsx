import { type ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  message: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, message, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{message}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

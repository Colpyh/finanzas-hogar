import { type ReactNode } from "react";

type Props = {
  title: string;
  actions?: ReactNode;
};

export function PageHeader({ title, actions }: Props) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

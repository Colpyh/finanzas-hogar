import { Badge } from "@/components/ui/badge";

type Props = {
  paid: number;
  total: number;
};

export function InstallmentProgress({ paid, total }: Props) {
  const done = paid >= total;
  return (
    <Badge
      className={
        done
          ? "bg-green-100 text-green-800 hover:bg-green-100"
          : "bg-blue-100 text-blue-800 hover:bg-blue-100"
      }
    >
      {paid}/{total}
    </Badge>
  );
}

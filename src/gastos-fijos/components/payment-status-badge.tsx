import { Badge } from "@/components/ui/badge";

type Props = {
  isPaid: boolean;
};

export function PaymentStatusBadge({ isPaid }: Props) {
  if (isPaid) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Pagado
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
      Pendiente
    </Badge>
  );
}

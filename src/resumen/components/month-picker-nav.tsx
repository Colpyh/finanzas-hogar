"use client";

import { useRouter } from "next/navigation";
import { MonthPicker } from "@/resumen/components/month-picker";

type Props = {
  month: string; // 'YYYY-MM'
};

export function MonthPickerNav({ month }: Props) {
  const router = useRouter();

  return (
    <MonthPicker
      month={month}
      onChange={(newMonth) => {
        router.push(`/resumen?month=${newMonth}`);
      }}
    />
  );
}

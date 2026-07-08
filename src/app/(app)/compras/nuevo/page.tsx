import type { Metadata } from "next";
import { NuevoCompraPageWrapper } from "./page-wrapper";

export const metadata: Metadata = { title: "Nueva Compra" };

type Props = {
  searchParams: Promise<{
    tipo?: string;
    desc?: string;
    amount?: string;
    categoryId?: string;
    cardId?: string;
    responsibleId?: string;
  }>;
};

export default async function NuevoCompraPage({ searchParams }: Props) {
  const params = await searchParams;
  return <NuevoCompraPageWrapper params={params} />;
}

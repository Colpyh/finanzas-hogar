import type { Metadata } from "next";
import { NuevoCompraPageWrapper } from "./page-wrapper";

export const metadata: Metadata = { title: "Nueva Compra" };

export default function NuevoCompraPage() {
  return <NuevoCompraPageWrapper />;
}

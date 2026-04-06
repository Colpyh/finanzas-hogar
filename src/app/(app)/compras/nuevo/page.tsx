"use client";

import { useState } from "react";
import Link from "next/link";
import { PurchaseForm } from "@/compras/components/purchase-form";
import { InstallmentForm } from "@/compras/components/installment-form";

// Categories are fetched server-side — this page is a client component
// that switches between form types. Categories passed as props via a wrapper.
export { NuevoCompraPageWrapper as default } from "./page-wrapper";

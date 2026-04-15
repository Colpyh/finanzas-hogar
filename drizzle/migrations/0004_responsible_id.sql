-- Migration 0004: responsable de pago en expense
ALTER TABLE "expense" ADD COLUMN "responsible_id" uuid;

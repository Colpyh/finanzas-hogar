"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import { SHAKE_KEY, SHAKE_PREF_EVENT } from "@/shared/lib/shake";

// iOS 13+ exige pedir permiso de movimiento desde un gesto de usuario.
type DME = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function ShakeToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    setSupported(true);
    setEnabled(localStorage.getItem(SHAKE_KEY) === "1");
  }, []);

  // En un dispositivo sin acelerómetro (desktop) no tiene sentido mostrarlo.
  if (!supported) return null;

  async function toggle() {
    if (enabled) {
      localStorage.removeItem(SHAKE_KEY);
      setEnabled(false);
      window.dispatchEvent(new Event(SHAKE_PREF_EVENT));
      return;
    }

    // Al activar: pedir permiso de movimiento en iOS (este click ES el gesto).
    const dme = DeviceMotionEvent as DME;
    if (typeof dme.requestPermission === "function") {
      try {
        const res = await dme.requestPermission();
        if (res !== "granted") {
          toast.error("Permiso de movimiento denegado");
          return;
        }
      } catch {
        toast.error("No se pudo pedir el permiso de movimiento");
        return;
      }
    }

    localStorage.setItem(SHAKE_KEY, "1");
    setEnabled(true);
    window.dispatchEvent(new Event(SHAKE_PREF_EVENT));
    toast.success("Listo: sacudí el celu para registrar un gasto");
  }

  return (
    <Button variant={enabled ? "default" : "outline"} onClick={toggle} className="gap-2">
      <Smartphone size={15} />
      {enabled ? "Sacudir activado" : "Activar sacudir para nuevo gasto"}
    </Button>
  );
}

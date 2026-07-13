"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SHAKE_KEY, SHAKE_PREF_EVENT } from "@/shared/lib/shake";

// Delta de aceleración (m/s²) que cuenta como sacudida deliberada, y un
// anti-rebote para no disparar varias veces por la misma sacudida.
const THRESHOLD = 25;
const DEBOUNCE_MS = 1500;

/**
 * Escucha el acelerómetro SOLO cuando el usuario activó "sacudir para nuevo
 * gasto" en Ajustes (y, en iOS, concedió el permiso de movimiento ahí — un
 * gesto de usuario). Al sacudir el celu con la app abierta, navega a
 * /compras/nuevo. Cerrada, esto no corre: una web no escucha sensores en
 * segundo plano (por eso NO existe "golpear para abrir").
 */
export function ShakeListener() {
  const router = useRouter();
  const lastShake = useRef(0);
  const last = useRef<{ x: number; y: number; z: number } | null>(null);

  useEffect(() => {
    let listening = false;

    function onMotion(e: DeviceMotionEvent) {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const cur = { x: a.x, y: a.y, z: a.z };
      const prev = last.current;
      last.current = cur;
      if (!prev) return;

      const delta =
        Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) + Math.abs(cur.z - prev.z);
      if (delta <= THRESHOLD) return;

      const now = Date.now();
      if (now - lastShake.current < DEBOUNCE_MS) return;
      lastShake.current = now;

      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      toast("Nuevo gasto", { description: "Abriendo por sacudida" });
      router.push("/compras/nuevo");
    }

    function start() {
      if (listening || !("DeviceMotionEvent" in window)) return;
      listening = true;
      window.addEventListener("devicemotion", onMotion);
    }
    function stop() {
      if (!listening) return;
      listening = false;
      window.removeEventListener("devicemotion", onMotion);
    }
    function sync() {
      if (localStorage.getItem(SHAKE_KEY) === "1") start();
      else stop();
    }

    sync();
    window.addEventListener(SHAKE_PREF_EVENT, sync);
    return () => {
      stop();
      window.removeEventListener(SHAKE_PREF_EVENT, sync);
    };
  }, [router]);

  return null;
}

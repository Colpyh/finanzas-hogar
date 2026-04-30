"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return view;
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    getCurrentSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  if (!supported) return null;

  function handleToggle() {
    startTransition(async () => {
      if (subscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    });
  }

  async function subscribe() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permiso de notificaciones denegado. Habilitalo desde la configuración del navegador.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error("Configuración de notificaciones incompleta.");
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        }),
      });

      if (!res.ok) throw new Error("Error al guardar suscripción");

      setSubscribed(true);
      toast.success("Notificaciones activadas");
    } catch (err) {
      console.error("[push] subscribe error", err);
      toast.error("No se pudieron activar las notificaciones.");
    }
  }

  async function unsubscribe() {
    try {
      const sub = await getCurrentSubscription();
      if (!sub) {
        setSubscribed(false);
        return;
      }

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setSubscribed(false);
      toast.success("Notificaciones desactivadas");
    } catch (err) {
      console.error("[push] unsubscribe error", err);
      toast.error("No se pudieron desactivar las notificaciones.");
    }
  }

  return (
    <Button
      variant={subscribed ? "default" : "outline"}
      onClick={handleToggle}
      disabled={isPending}
      className="w-full sm:w-auto"
    >
      {subscribed ? (
        <>
          <Bell size={16} className="mr-2" />
          Notificaciones activas
        </>
      ) : (
        <>
          <BellOff size={16} className="mr-2" />
          Activar notificaciones
        </>
      )}
    </Button>
  );
}

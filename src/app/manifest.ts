import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanzas Hogar",
    short_name: "Finanzas",
    description: "Tu control financiero compartido",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf9ff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Accesos rápidos: mantené presionado el ícono de la PWA en el celu.
    shortcuts: [
      {
        name: "Nuevo gasto",
        short_name: "Nuevo gasto",
        url: "/compras/nuevo",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Gastos pendientes",
        short_name: "Pendientes",
        url: "/gastos-pendientes",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Balances",
        short_name: "Balances",
        url: "/balances",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}

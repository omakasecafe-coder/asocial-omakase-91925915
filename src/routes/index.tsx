import { createFileRoute } from "@tanstack/react-router";
import { BookingExperience } from "@/components/asocial/BookingExperience";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "asocial · café omakase — Reserva tu sesión" },
      {
        name: "description",
        content:
          "Reserva una sesión privada de café omakase en asocial: pocas plazas, ritmo pausado y una barra guiada.",
      },
      { property: "og:title", content: "asocial · café omakase" },
      {
        property: "og:description",
        content: "Sesiones íntimas de café guiado. Elige fecha, hora y reserva en un minuto.",
      },
    ],
  }),
  component: BookingExperience,
});

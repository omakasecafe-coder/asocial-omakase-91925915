import { createFileRoute } from "@tanstack/react-router";
import { BookingExperience } from "@/components/asocial/BookingExperience";

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Reservar una sesión · asocial café omakase" },
      {
        name: "description",
        content: "Elige el momento, indica cuántos vienen y confirma tu lugar en la barra de asocial.",
      },
      { property: "og:title", content: "Reservar una sesión · asocial" },
      {
        property: "og:description",
        content: "Elige el momento, indica cuántos vienen y confirma tu lugar en la barra de asocial.",
      },
    ],
  }),
  component: BookingExperience,
});

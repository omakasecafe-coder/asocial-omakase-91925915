import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getSiteHostname = createServerFn({ method: "GET" }).handler(() => {
  return new URL(getRequest().url).hostname;
});

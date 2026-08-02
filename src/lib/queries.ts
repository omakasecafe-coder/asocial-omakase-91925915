import { queryOptions } from "@tanstack/react-query";
import { getWorkspace, getSettings } from "@/lib/admin.functions";
import { getPublicSessions } from "@/lib/public.functions";

export const workspaceQuery = () =>
  queryOptions({
    queryKey: ["workspace"],
    queryFn: () => getWorkspace(),
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

export const publicSessionsQuery = () =>
  queryOptions({
    queryKey: ["public-sessions"],
    queryFn: () => getPublicSessions(),
  });

export type Workspace = Awaited<ReturnType<typeof getWorkspace>>;
export type SessionRow = Workspace["sessions"][number];
export type ReservationRow = Workspace["reservations"][number];
export type CustomerRow = Workspace["customers"][number];
export type PaymentRow = Workspace["payments"][number];
export type BlockRow = Workspace["blocks"][number];

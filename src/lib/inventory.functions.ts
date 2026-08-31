import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { InventoryWorkspace } from "@/lib/inventory";

const emptyInventoryWorkspace = (setupMessage?: string): InventoryWorkspace => ({
  items: [],
  lots: [],
  movements: [],
  recipes: [],
  recipeItems: [],
  menus: [],
  menuSteps: [],
  sessionCosts: [],
  setupRequired: Boolean(setupMessage),
  setupMessage,
});

function isMissingInventorySchema(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("inventory_items") || message.includes("schema cache");
}

export const getInventoryWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const [items, lots, movements, recipes, recipeItems, menus, menuSteps, sessionCosts] =
      await Promise.all([
        db.from("inventory_items").select("*").order("category").order("name"),
        db.from("inventory_lots").select("*").order("expires_at", { nullsFirst: false }),
        db.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(80),
        db.from("preparation_recipes").select("*").order("recipe_type").order("name"),
        db.from("recipe_items").select("*").order("created_at"),
        db.from("omakase_menus").select("*").order("created_at", { ascending: false }),
        db.from("omakase_menu_steps").select("*").order("step_order"),
        db.from("session_operating_costs").select("*").order("created_at", { ascending: false }),
      ]);

    const error =
      items.error ||
      lots.error ||
      movements.error ||
      recipes.error ||
      recipeItems.error ||
      menus.error ||
      menuSteps.error ||
      sessionCosts.error;
    if (isMissingInventorySchema(error)) {
      return emptyInventoryWorkspace(
        "Falta aplicar la migracion de inventario en Supabase para crear las tablas del modulo.",
      );
    }
    if (error) throw new Error(error.message);

    return {
      items: items.data ?? [],
      lots: lots.data ?? [],
      movements: movements.data ?? [],
      recipes: recipes.data ?? [],
      recipeItems: recipeItems.data ?? [],
      menus: menus.data ?? [],
      menuSteps: menuSteps.data ?? [],
      sessionCosts: sessionCosts.data ?? [],
    } satisfies InventoryWorkspace;
  });

const wasteInput = z.object({
  lotId: z.string().uuid(),
  quantity: z.number().positive().max(100000),
  reason: z.enum(["vencimiento", "calidad", "preparacion", "conteo", "otro"]),
  notes: z.string().trim().max(400).optional().default(""),
});

export const recordInventoryWaste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => wasteInput.parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: lot, error: lotError } = await db
      .from("inventory_lots")
      .select("id, item_id, quantity_available, unit_cost, status, inventory_items(base_unit)")
      .eq("id", data.lotId)
      .single();
    if (isMissingInventorySchema(lotError)) {
      throw new Error("Primero aplica la migracion de inventario en Supabase.");
    }
    if (lotError) throw new Error(lotError.message);

    const available = Number(lot.quantity_available ?? 0);
    if (data.quantity > available) {
      throw new Error("La merma supera el stock disponible del lote");
    }

    const nextAvailable = Math.max(available - data.quantity, 0);
    const { error: movementError } = await db.from("stock_movements").insert({
      item_id: lot.item_id,
      lot_id: lot.id,
      movement_type: "waste",
      quantity: data.quantity,
      unit: lot.inventory_items?.base_unit ?? "un",
      unit_cost_snapshot: lot.unit_cost,
      reason: data.reason,
      notes: data.notes,
      created_by: context.userId,
    });
    if (movementError) throw new Error(movementError.message);

    const nextStatus =
      nextAvailable === 0
        ? "depleted"
        : data.reason === "vencimiento" || data.reason === "calidad"
          ? "blocked"
          : lot.status;

    const { error: updateError } = await db
      .from("inventory_lots")
      .update({ quantity_available: nextAvailable, status: nextStatus })
      .eq("id", lot.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });

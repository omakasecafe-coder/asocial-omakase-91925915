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
      items: (items.data ?? []) as InventoryWorkspace["items"],
      lots: (lots.data ?? []) as InventoryWorkspace["lots"],
      movements: (movements.data ?? []) as InventoryWorkspace["movements"],
      recipes: (recipes.data ?? []) as InventoryWorkspace["recipes"],
      recipeItems: (recipeItems.data ?? []) as InventoryWorkspace["recipeItems"],
      menus: (menus.data ?? []) as InventoryWorkspace["menus"],
      menuSteps: (menuSteps.data ?? []) as InventoryWorkspace["menuSteps"],
      sessionCosts: (sessionCosts.data ?? []) as InventoryWorkspace["sessionCosts"],
    } satisfies InventoryWorkspace;
  });

const wasteInput = z.object({
  lotId: z.string().uuid(),
  quantity: z.number().positive().max(100000),
  reason: z.enum(["vencimiento", "calidad", "preparacion", "conteo", "otro"]),
  notes: z.string().trim().max(400).optional().default(""),
});

const inventoryItemInput = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80).default("insumo"),
  base_unit: z.enum(["g", "ml", "un"]),
  presentation_quantity: z.number().positive().max(1000000),
  presentation_price: z.number().min(0).max(1000000),
  notes: z.string().trim().max(400).optional().default(""),
});

export const saveInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inventoryItemInput.parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const unitCost =
      data.presentation_quantity > 0 ? data.presentation_price / data.presentation_quantity : 0;
    const { data: item, error } = await db
      .from("inventory_items")
      .insert({
        ...data,
        default_unit_cost: unitCost,
      })
      .select("id")
      .single();
    if (isMissingInventorySchema(error)) {
      throw new Error("Primero aplica la migracion de inventario en Supabase.");
    }
    if (error) throw new Error(error.message);
    return { id: item.id as string };
  });

const inventoryLotInput = z.object({
  item_id: z.string().uuid(),
  lot_code: z.string().trim().max(80).optional().default(""),
  quantity: z.number().positive().max(1000000),
  total_cost: z.number().min(0).max(1000000),
  purchased_at: z.string().min(8).optional().nullable(),
  expires_at: z.string().min(8).optional().nullable(),
  notes: z.string().trim().max(400).optional().default(""),
});

export const saveInventoryLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inventoryLotInput.parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: item, error: itemError } = await db
      .from("inventory_items")
      .select("id, base_unit")
      .eq("id", data.item_id)
      .single();
    if (isMissingInventorySchema(itemError)) {
      throw new Error("Primero aplica la migracion de inventario en Supabase.");
    }
    if (itemError) throw new Error(itemError.message);

    const unitCost = data.total_cost / data.quantity;
    const { data: lot, error } = await db
      .from("inventory_lots")
      .insert({
        item_id: data.item_id,
        lot_code: data.lot_code,
        quantity_initial: data.quantity,
        quantity_available: data.quantity,
        unit_cost: unitCost,
        purchased_at: data.purchased_at || null,
        expires_at: data.expires_at || null,
        status: "available",
        notes: data.notes,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: movementError } = await db.from("stock_movements").insert({
      item_id: data.item_id,
      lot_id: lot.id,
      movement_type: "purchase",
      quantity: data.quantity,
      unit: item.base_unit,
      unit_cost_snapshot: unitCost,
      notes: data.notes,
      created_by: context.userId,
    });
    if (movementError) throw new Error(movementError.message);
    return { id: lot.id as string };
  });

const recipeInput = z.object({
  name: z.string().trim().min(1).max(120),
  recipe_type: z.enum(["base", "drink", "pairing"]),
  yield_quantity: z.number().positive().max(1000000),
  yield_unit: z.enum(["g", "ml", "un"]),
  portion_quantity: z.number().positive().max(1000000),
  notes: z.string().trim().max(500).optional().default(""),
  lines: z
    .array(
      z.object({
        inventory_item_id: z.string().uuid().optional().nullable(),
        nested_recipe_id: z.string().uuid().optional().nullable(),
        quantity: z.number().positive().max(1000000),
        unit: z.enum(["g", "ml", "un"]),
        notes: z.string().trim().max(200).optional().default(""),
      }),
    )
    .max(40)
    .default([]),
});

export const savePreparationRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => recipeInput.parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { lines, ...recipePayload } = data;
    const { data: recipe, error } = await db
      .from("preparation_recipes")
      .insert({ ...recipePayload, active: true })
      .select("id")
      .single();
    if (isMissingInventorySchema(error)) {
      throw new Error("Primero aplica la migracion de inventario en Supabase.");
    }
    if (error) throw new Error(error.message);

    const cleanLines = lines
      .filter((line) => line.inventory_item_id || line.nested_recipe_id)
      .map((line) => ({
        recipe_id: recipe.id,
        inventory_item_id: line.inventory_item_id || null,
        nested_recipe_id: line.nested_recipe_id || null,
        quantity: line.quantity,
        unit: line.unit,
        notes: line.notes,
      }));
    if (cleanLines.length > 0) {
      const { error: linesError } = await db.from("recipe_items").insert(cleanLines);
      if (linesError) throw new Error(linesError.message);
    }

    await db.from("audit_logs").insert({
      user_id: context.userId,
      action: "create_recipe",
      entity_type: "preparation_recipe",
      entity_id: recipe.id,
      new_values: recipePayload,
    });
    return { id: recipe.id as string };
  });

const menuInput = z.object({
  name: z.string().trim().min(1).max(120),
  price_per_person: z.number().min(0).max(1000000),
  notes: z.string().trim().max(500).optional().default(""),
  steps: z
    .array(
      z.object({
        step_order: z.number().int().min(0).max(100),
        step_name: z.string().trim().min(1).max(120),
        drink_recipe_id: z.string().uuid().optional().nullable(),
        pairing_recipe_id: z.string().uuid().optional().nullable(),
        pairing_optional: z.boolean().default(false),
      }),
    )
    .max(30)
    .default([]),
});

export const saveOmakaseMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => menuInput.parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { steps, ...menuPayload } = data;
    const { data: menu, error } = await db
      .from("omakase_menus")
      .insert({ ...menuPayload, active: true })
      .select("id")
      .single();
    if (isMissingInventorySchema(error)) {
      throw new Error("Primero aplica la migracion de inventario en Supabase.");
    }
    if (error) throw new Error(error.message);

    const cleanSteps = steps.map((step) => ({
      menu_id: menu.id,
      step_order: step.step_order,
      step_name: step.step_name,
      drink_recipe_id: step.drink_recipe_id || null,
      pairing_recipe_id: step.pairing_recipe_id || null,
      pairing_optional: step.pairing_optional,
    }));
    if (cleanSteps.length > 0) {
      const { error: stepsError } = await db.from("omakase_menu_steps").insert(cleanSteps);
      if (stepsError) throw new Error(stepsError.message);
    }

    await db.from("audit_logs").insert({
      user_id: context.userId,
      action: "create_menu",
      entity_type: "omakase_menu",
      entity_id: menu.id,
      new_values: menuPayload,
    });
    return { id: menu.id as string };
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

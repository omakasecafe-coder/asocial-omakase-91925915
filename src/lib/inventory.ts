export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  base_unit: "g" | "ml" | "un";
  presentation_quantity: number | string;
  presentation_price: number | string;
  default_unit_cost: number | string;
  active: boolean;
  notes: string;
};

export type InventoryLot = {
  id: string;
  item_id: string;
  lot_code: string;
  quantity_initial: number | string;
  quantity_available: number | string;
  unit_cost: number | string;
  purchased_at: string | null;
  expires_at: string | null;
  status: "available" | "expiring" | "expired" | "blocked" | "discarded" | "depleted";
  notes: string;
  created_at: string;
};

export type StockMovement = {
  id: string;
  item_id: string;
  lot_id: string | null;
  movement_type: "purchase" | "session_use" | "recipe_use" | "waste" | "adjustment";
  quantity: number | string;
  unit: "g" | "ml" | "un";
  unit_cost_snapshot: number | string;
  reason: "vencimiento" | "calidad" | "preparacion" | "conteo" | "otro" | null;
  notes: string;
  created_at: string;
};

export type PreparationRecipe = {
  id: string;
  name: string;
  recipe_type: "base" | "drink" | "pairing";
  yield_quantity: number | string;
  yield_unit: "g" | "ml" | "un";
  portion_quantity: number | string;
  active: boolean;
  notes: string;
};

export type RecipeItem = {
  id: string;
  recipe_id: string;
  inventory_item_id: string | null;
  nested_recipe_id: string | null;
  quantity: number | string;
  unit: "g" | "ml" | "un";
  notes: string;
};

export type OmakaseMenu = {
  id: string;
  name: string;
  price_per_person: number | string;
  active: boolean;
  notes: string;
};

export type OmakaseMenuStep = {
  id: string;
  menu_id: string;
  step_order: number;
  step_name: string;
  drink_recipe_id: string | null;
  pairing_recipe_id: string | null;
  pairing_optional: boolean;
};

export type SessionOperatingCost = {
  id: string;
  session_id: string;
  menu_id: string | null;
  estimated_guests: number;
  served_menus: number;
  venue_cost: number | string;
  barista_cost: number | string;
  other_cost: number | string;
  notes: string;
};

export type InventoryWorkspace = {
  items: InventoryItem[];
  lots: InventoryLot[];
  movements: StockMovement[];
  recipes: PreparationRecipe[];
  recipeItems: RecipeItem[];
  menus: OmakaseMenu[];
  menuSteps: OmakaseMenuStep[];
  sessionCosts: SessionOperatingCost[];
  setupRequired?: boolean | undefined;
  setupMessage?: string | undefined;
};

export function asNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function itemById(ws: InventoryWorkspace, id: string | null | undefined) {
  return ws.items.find((item) => item.id === id);
}

export function recipeById(ws: InventoryWorkspace, id: string | null | undefined) {
  return ws.recipes.find((recipe) => recipe.id === id);
}

export function lotStatusLabel(status: InventoryLot["status"]) {
  const labels: Record<InventoryLot["status"], string> = {
    available: "Disponible",
    expiring: "Por vencer",
    expired: "Vencido",
    blocked: "Bloqueado",
    discarded: "Descartado",
    depleted: "Agotado",
  };
  return labels[status];
}

export function lotStatusClass(status: InventoryLot["status"]) {
  if (status === "available") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "expiring") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "expired" || status === "discarded") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-border bg-muted text-muted-foreground";
}

export function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function recipeCost(
  ws: InventoryWorkspace,
  recipeId: string | null | undefined,
  seen = new Set<string>(),
): number {
  if (!recipeId || seen.has(recipeId)) return 0;
  const recipe = recipeById(ws, recipeId);
  if (!recipe) return 0;

  const nextSeen = new Set(seen);
  nextSeen.add(recipeId);
  const total: number = ws.recipeItems
    .filter((line) => line.recipe_id === recipeId)
    .reduce<number>((sum, line) => {
      if (line.inventory_item_id) {
        const item = itemById(ws, line.inventory_item_id);
        return sum + asNumber(line.quantity) * asNumber(item?.default_unit_cost);
      }
      return sum + asNumber(line.quantity) * recipeCost(ws, line.nested_recipe_id, nextSeen);
    }, 0);

  const portion = asNumber(recipe.portion_quantity) || 1;
  return total / portion;
}

export function menuCost(ws: InventoryWorkspace, menuId: string | null | undefined) {
  if (!menuId) return 0;
  return ws.menuSteps
    .filter((step) => step.menu_id === menuId)
    .reduce((sum, step) => {
      return sum + recipeCost(ws, step.drink_recipe_id) + recipeCost(ws, step.pairing_recipe_id);
    }, 0);
}

export function movementCost(movement: StockMovement) {
  return asNumber(movement.quantity) * asNumber(movement.unit_cost_snapshot);
}

export function lotValue(lot: InventoryLot) {
  return asNumber(lot.quantity_available) * asNumber(lot.unit_cost);
}

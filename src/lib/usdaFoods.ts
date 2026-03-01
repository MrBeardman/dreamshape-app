import type { OFFProduct } from './openFoodFacts'

// Nutrient IDs in USDA FoodData Central
const NID_ENERGY  = 1008  // kcal
const NID_PROTEIN = 1003
const NID_CARBS   = 1005
const NID_FAT     = 1004
const NID_SUGAR   = 2000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNutrient(foodNutrients: any[], id: number): number {
  const n = foodNutrients.find((n: any) => n.nutrientId === id)
  return n ? Math.round((n.value ?? 0) * 10) / 10 : 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUSDAFood(food: any): OFFProduct | null {
  const name = (food.description ?? food.lowercaseDescription ?? '').trim()
  if (!name) return null
  const nutrients = food.foodNutrients ?? []
  const kcal = Math.max(0, Math.round(getNutrient(nutrients, NID_ENERGY)))
  return {
    name,
    brand: food.brandOwner?.trim() || undefined,
    caloriesPer100g: kcal,
    proteinPer100g: getNutrient(nutrients, NID_PROTEIN),
    carbsPer100g: getNutrient(nutrients, NID_CARBS),
    fatPer100g: getNutrient(nutrients, NID_FAT),
    sugarPer100g: getNutrient(nutrients, NID_SUGAR),
    unit: 'g',  // USDA always reports per 100g
  }
}

const cache = new Map<string, { results: OFFProduct[]; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000  // 5 min

export async function searchUSDA(query: string): Promise<OFFProduct[]> {
  const key = query.toLowerCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log('[USDA] cache hit for:', query)
    return cached.results
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    console.warn('[USDA] request timed out after 20s')
    controller.abort()
  }, 20000)

  try {
    const url =
      `https://api.nal.usda.gov/fdc/v1/foods/search` +
      `?query=${encodeURIComponent(query)}` +
      `&api_key=DEMO_KEY` +
      `&dataType=Foundation,SR%20Legacy` +
      `&pageSize=20`
    console.log('[USDA] search:', url)
    const resp = await fetch(url, { signal: controller.signal })
    console.log('[USDA] search status:', resp.status)
    if (!resp.ok) {
      console.warn('[USDA] search failed:', resp.status, resp.statusText)
      return []
    }
    const data = await resp.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foods: OFFProduct[] = (data.foods as any[] ?? [])
      .map(mapUSDAFood)
      .filter((f): f is OFFProduct => f !== null)
    console.log('[USDA] results:', foods.length)
    cache.set(key, { results: foods, ts: Date.now() })
    return foods
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') console.error('[USDA] search error:', err)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

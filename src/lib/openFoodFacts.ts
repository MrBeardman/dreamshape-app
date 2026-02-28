export interface OFFProduct {
  name: string
  brand?: string
  barcode?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  sugarPer100g: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNutriments(n: Record<string, any>, name: string, brand?: string, barcode?: string): OFFProduct | null {
  if (!name?.trim()) return null
  // energy-kcal_100g is kcal directly; energy_100g is kJ → divide by 4.184
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0)
  return {
    name: name.trim(),
    brand: brand?.trim() || undefined,
    barcode: barcode || undefined,
    caloriesPer100g: Math.max(0, Math.round(kcal)),
    proteinPer100g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
    carbsPer100g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
    fatPer100g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
    sugarPer100g: Math.round((n['sugars_100g'] ?? 0) * 10) / 10,
  }
}

export async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const resp = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,code`
    )
    if (!resp.ok) return null
    const data = await resp.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    return parseNutriments(
      p.nutriments ?? {},
      p.product_name || p.product_name_en || '',
      p.brands,
      barcode
    )
  } catch {
    return null
  }
}

export async function searchFoods(query: string): Promise<OFFProduct[]> {
  try {
    // v2 search API — faster than legacy /cgi/search.pl, sorted by scan count so
    // the most popular (best-documented) products come first
    const url =
      `https://world.openfoodfacts.org/api/v2/search` +
      `?search_terms=${encodeURIComponent(query)}` +
      `&page_size=25` +
      `&fields=product_name,brands,nutriments,code` +
      `&sort_by=unique_scans_n`
    const resp = await fetch(url)
    if (!resp.ok) return []
    const data = await resp.json()
    if (!data.products) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.products as any[])
      .map((p) =>
        parseNutriments(p.nutriments ?? {}, p.product_name || '', p.brands, p.code)
      )
      .filter((p): p is OFFProduct => p !== null)
  } catch {
    return []
  }
}

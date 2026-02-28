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
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null)
  if (!kcal || kcal <= 0) return null
  return {
    name: name || 'Unknown Product',
    brand: brand || undefined,
    barcode: barcode || undefined,
    caloriesPer100g: Math.round(kcal),
    proteinPer100g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
    carbsPer100g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
    fatPer100g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
    sugarPer100g: Math.round((n['sugars_100g'] ?? 0) * 10) / 10,
  }
}

export async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const resp = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
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
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?action=process` +
      `&search_terms=${encodeURIComponent(query)}` +
      `&json=1&page_size=20` +
      `&fields=product_name,brands,nutriments,code`
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

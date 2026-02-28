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

/**
 * Pick the best Open Food Facts subdomain based on the browser locale.
 * Country-specific subdomains (cz.openfoodfacts.org, de.openfoodfacts.org, …)
 * are smaller → faster, and return locally relevant products first.
 */
function getOFFBaseUrl(): string {
  const lang = (navigator.language ?? '').toLowerCase()
  const parts = lang.split('-') // e.g. ['cs', 'cz'] or ['de'] or ['en', 'us']

  // Country code explicitly in the locale tag, e.g. cs-CZ → 'cz'
  if (parts.length > 1) {
    const cc = parts[1]
    const supported = new Set([
      'cz', 'sk', 'de', 'fr', 'es', 'it', 'pl', 'nl', 'pt',
      'ro', 'hu', 'gb', 'us', 'be', 'ch', 'at', 'se', 'no', 'dk', 'fi',
    ])
    if (supported.has(cc)) return `https://${cc}.openfoodfacts.org`
  }

  // Language code → country code for languages where they differ
  const langToCC: Record<string, string> = {
    cs: 'cz', sk: 'sk', de: 'de', fr: 'fr', es: 'es', it: 'it',
    pl: 'pl', nl: 'nl', pt: 'pt', ro: 'ro', hu: 'hu',
  }
  const cc = langToCC[parts[0]]
  return cc ? `https://${cc}.openfoodfacts.org` : 'https://world.openfoodfacts.org'
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
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const base = getOFFBaseUrl()
    const resp = await fetch(
      `${base}/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,code`,
      { signal: controller.signal }
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
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchFoods(query: string): Promise<OFFProduct[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const base = getOFFBaseUrl()
    const url =
      `${base}/api/v2/search` +
      `?search_terms=${encodeURIComponent(query)}` +
      `&page_size=25` +
      `&fields=product_name,brands,nutriments,code` +
      `&sort_by=unique_scans_n`
    const resp = await fetch(url, { signal: controller.signal })
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
  } finally {
    clearTimeout(timeout)
  }
}

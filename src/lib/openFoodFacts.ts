export interface OFFProduct {
  name: string
  brand?: string
  barcode?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  sugarPer100g: number
  unit?: 'g' | 'ml'
  servingQuantity?: number   // numeric amount in g or ml
  packageQuantity?: number   // total package in g or ml
  servingName?: string       // e.g. "1 slice", "1 can"
}

/**
 * Returns &lc=xx&cc=yy params for the OFF v2 API based on browser locale.
 * Always uses world.openfoodfacts.org so the full database is searched,
 * but locale params ensure locally relevant products are ranked higher.
 */
function getLocaleParams(): string {
  const lang = (navigator.language ?? '').toLowerCase()
  const [lc, ccFromTag] = lang.split('-')
  const langToCC: Record<string, string> = {
    cs: 'cz', sk: 'sk', de: 'de', fr: 'fr', es: 'es', it: 'it',
    pl: 'pl', nl: 'nl', pt: 'pt', ro: 'ro', hu: 'hu', sv: 'se',
    nb: 'no', da: 'dk', fi: 'fi',
  }
  const cc = ccFromTag ?? langToCC[lc] ?? ''
  if (lc && cc) return `&lc=${lc}&cc=${cc}`
  if (lc && lc !== 'en') return `&lc=${lc}`
  return ''
}

/** Detect g vs ml from serving_size / product_quantity text fields */
function detectUnit(servingSizeStr?: string, productQuantityStr?: string): 'g' | 'ml' {
  const haystack = `${servingSizeStr ?? ''} ${productQuantityStr ?? ''}`.toLowerCase()
  if (/\d\s*(?:ml|cl|l\b)/.test(haystack)) return 'ml'
  return 'g'
}

/**
 * Parse the most meaningful number from a quantity string.
 * Prefers a number followed by a unit to avoid matching counts ("6 x 250ml" → 250).
 * Handles unit conversions: kg→g, l→ml, cl→ml, oz→g, lb→g.
 */
function parseQuantityStr(str?: string): number | undefined {
  if (!str) return undefined
  // Prefer "number + unit" match to avoid multi-pack "6 x 250ml" → 6
  const withUnit = str.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l\b|oz|lb)/i)
  if (withUnit) {
    let val = parseFloat(withUnit[1].replace(',', '.'))
    const u = withUnit[2].toLowerCase()
    if (u === 'kg') val *= 1000
    else if (u === 'l') val *= 1000
    else if (u === 'cl') val *= 10
    else if (u === 'oz') val *= 28.35
    else if (u === 'lb') val *= 453.6
    return val > 0 ? val : undefined
  }
  // Fallback: any number
  const m = str.match(/(\d+(?:[.,]\d+)?)/)
  return m ? parseFloat(m[1].replace(',', '.')) : undefined
}

/**
 * Extract a human-readable serving name from the serving_size string.
 * "1 slice (30g)" → "1 slice"
 * "330ml"         → "1 serving"
 * "1 can"         → "1 can"
 */
function parseServingName(servingSizeStr?: string): string {
  if (!servingSizeStr) return '1 serving'
  // Match leading word-based description (stops at first digit)
  const wordPart = servingSizeStr.match(/^([^\d]+(?:\d+[^\d]+)??)(?=\s*[\d(]|$)/)
  if (wordPart) {
    const name = wordPart[1].trim().replace(/\s*[-–]\s*$/, '')
    if (name.length > 0 && name.length < 40 && /[a-z]/i.test(name)) return name
  }
  return '1 serving'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNutriments(
  n: Record<string, any>,
  name: string,
  brand?: string,
  barcode?: string,
  servingSizeStr?: string,
  servingQuantityRaw?: number,
  productQuantityStr?: string,
): OFFProduct | null {
  if (!name?.trim()) return null
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0)
  const unit = detectUnit(servingSizeStr, productQuantityStr)
  // serving_quantity from API is the most reliable numeric value
  const servingQuantity = (servingQuantityRaw && servingQuantityRaw > 0)
    ? servingQuantityRaw
    : parseQuantityStr(servingSizeStr)
  const packageQuantity = parseQuantityStr(productQuantityStr)
  const servingName = parseServingName(servingSizeStr)

  return {
    name: name.trim(),
    brand: brand?.trim() || undefined,
    barcode: barcode || undefined,
    caloriesPer100g: Math.max(0, Math.round(kcal)),
    proteinPer100g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
    carbsPer100g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
    fatPer100g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
    sugarPer100g: Math.round((n['sugars_100g'] ?? 0) * 10) / 10,
    unit,
    servingQuantity: servingQuantity && servingQuantity >= 1 ? Math.round(servingQuantity) : undefined,
    packageQuantity: packageQuantity && packageQuantity >= 1 ? Math.round(packageQuantity) : undefined,
    servingName,
  }
}

const EXTRA_FIELDS = 'serving_size,serving_quantity,product_quantity'

export async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    console.warn('[OFF] request timed out after 15s')
    controller.abort()
  }, 15000)
  try {
    const locale = getLocaleParams()
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,code,${EXTRA_FIELDS}${locale}`
    console.log('[OFF] barcode lookup:', url)
    const resp = await fetch(url, { signal: controller.signal })
    console.log('[OFF] barcode status:', resp.status)
    if (!resp.ok) {
      console.warn('[OFF] barcode lookup failed:', resp.status)
      return null
    }
    const data = await resp.json()
    if (data.status !== 1 || !data.product) {
      console.log('[OFF] barcode: product not found (status:', data.status, ')')
      return null
    }
    const p = data.product
    console.log('[OFF] barcode product:', p.product_name, '| serving_size:', p.serving_size, '| serving_quantity:', p.serving_quantity, '| product_quantity:', p.product_quantity)
    return parseNutriments(
      p.nutriments ?? {},
      p.product_name || p.product_name_en || '',
      p.brands,
      barcode,
      p.serving_size,
      p.serving_quantity != null ? Number(p.serving_quantity) : undefined,
      p.product_quantity,
    )
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') console.error('[OFF] barcode error:', err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchFoods(query: string): Promise<OFFProduct[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    console.warn('[OFF] request timed out after 15s')
    controller.abort()
  }, 15000)
  try {
    const locale = getLocaleParams()
    // /cgi/search.pl is the Elasticsearch-powered endpoint that actually filters
    // by search_terms. The v2 /api/v2/search ignores search_terms without sort_by,
    // and sort_by=unique_scans_n sorts 4M+ products server-side (takes 30s+).
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl` +
      `?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1` +
      `&action=process` +
      `&json=1` +
      `&page_size=25` +
      `&fields=product_name,brands,nutriments,code,${EXTRA_FIELDS}` +
      locale
    console.log('[OFF] search:', url)
    const resp = await fetch(url, { signal: controller.signal })
    console.log('[OFF] search status:', resp.status)
    if (!resp.ok) {
      console.warn('[OFF] search failed:', resp.status, resp.statusText)
      return []
    }
    const data = await resp.json()
    console.log('[OFF] raw products:', data.products?.length ?? 0, '| total count:', data.count)
    if (!data.products) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (data.products as any[])
      .map((p) =>
        parseNutriments(
          p.nutriments ?? {},
          p.product_name || '',
          p.brands,
          p.code,
          p.serving_size,
          p.serving_quantity != null ? Number(p.serving_quantity) : undefined,
          p.product_quantity,
        )
      )
      .filter((p): p is OFFProduct => p !== null)
    console.log('[OFF] filtered products:', mapped.length)
    return mapped
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') console.error('[OFF] search error:', err)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

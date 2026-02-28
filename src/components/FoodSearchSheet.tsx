import { useState, useEffect, useRef } from 'react'
import type { FoodItem, MealEntry, FoodPortion } from '../types'
import { searchFoods, lookupBarcode } from '../lib/openFoodFacts'
import type { OFFProduct } from '../lib/openFoodFacts'
import BarcodeScanner from './BarcodeScanner'

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks'
type Tab = 'search' | 'my-foods'

interface FoodSearchSheetProps {
  meal: Meal
  customFoods: FoodItem[]
  recentFoods: FoodItem[]
  onAdd: (entry: MealEntry) => void
  onAddCustomFood: (food: FoodItem) => void
  onDeleteCustomFood: (foodId: string) => void
  onAddRecentFood: (food: FoodItem) => void
  onClose: () => void
}

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

function calcMacros(food: FoodItem, grams: number) {
  const g = grams / 100
  return {
    calories: Math.round(food.caloriesPer100g * g * 10) / 10,
    protein: Math.round(food.proteinPer100g * g * 10) / 10,
    carbs: Math.round(food.carbsPer100g * g * 10) / 10,
    fat: Math.round(food.fatPer100g * g * 10) / 10,
    sugar: Math.round(food.sugarPer100g * g * 10) / 10,
  }
}

function offToFoodItem(p: OFFProduct): FoodItem {
  return {
    id: crypto.randomUUID(),
    name: p.name,
    brand: p.brand,
    barcode: p.barcode,
    caloriesPer100g: p.caloriesPer100g,
    proteinPer100g: p.proteinPer100g,
    carbsPer100g: p.carbsPer100g,
    fatPer100g: p.fatPer100g,
    sugarPer100g: p.sugarPer100g,
    isCustom: false,
  }
}

export default function FoodSearchSheet({
  meal,
  customFoods,
  recentFoods,
  onAdd,
  onAddCustomFood,
  onDeleteCustomFood,
  onAddRecentFood,
  onClose,
}: FoodSearchSheetProps) {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OFFProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState('100')
  const [showScanner, setShowScanner] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  // Custom food form
  const [customName, setCustomName] = useState('')
  const [customRefAmount, setCustomRefAmount] = useState('100')
  const [customCal, setCustomCal] = useState('')
  const [customProtein, setCustomProtein] = useState('')
  const [customCarbs, setCustomCarbs] = useState('')
  const [customFat, setCustomFat] = useState('')
  const [customSugar, setCustomSugar] = useState('')
  // Portions
  const [customPortions, setCustomPortions] = useState<Array<{ name: string; grams: string }>>([])
  const [newPortionName, setNewPortionName] = useState('')
  const [newPortionGrams, setNewPortionGrams] = useState('')

  // Keep sheet above keyboard via Visual Viewport API
  const sheetRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      if (!sheetRef.current) return
      const keyboardHeight = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      sheetRef.current.style.marginBottom = `${keyboardHeight}px`
      sheetRef.current.style.maxHeight = keyboardHeight > 0 ? `${vv.height * 0.95}px` : ''
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const r = await searchFoods(q)
      setResults(r)
      setIsSearching(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food)
    setGrams('100')
  }

  const handleBarcodeDetect = async (barcode: string) => {
    setShowScanner(false)
    setIsSearching(true)
    const p = await lookupBarcode(barcode)
    setIsSearching(false)
    if (p) {
      handleSelectFood(offToFoodItem(p))
    }
  }

  const handleAddEntry = () => {
    if (!selectedFood) return
    const g = parseFloat(grams) || 100
    const macros = calcMacros(selectedFood, g)
    const entry: MealEntry = {
      id: crypto.randomUUID(),
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      brand: selectedFood.brand,
      grams: g,
      meal,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      sugar: macros.sugar,
    }
    onAddRecentFood(selectedFood)
    onAdd(entry)
  }

  const handleAddPortion = () => {
    if (!newPortionName.trim() || !newPortionGrams) return
    setCustomPortions(prev => [...prev, { name: newPortionName.trim(), grams: newPortionGrams }])
    setNewPortionName('')
    setNewPortionGrams('')
  }

  const handleCreateCustomFood = () => {
    if (!customName.trim()) return
    const refAmount = Number(customRefAmount) || 100
    const factor = 100 / refAmount
    const portions: FoodPortion[] = customPortions
      .filter(p => p.name.trim() && Number(p.grams) > 0)
      .map(p => ({ name: p.name.trim(), grams: Number(p.grams) }))
    const food: FoodItem = {
      id: crypto.randomUUID(),
      name: customName.trim(),
      caloriesPer100g: Math.round((Number(customCal) || 0) * factor * 10) / 10,
      proteinPer100g: Math.round((Number(customProtein) || 0) * factor * 10) / 10,
      carbsPer100g: Math.round((Number(customCarbs) || 0) * factor * 10) / 10,
      fatPer100g: Math.round((Number(customFat) || 0) * factor * 10) / 10,
      sugarPer100g: Math.round((Number(customSugar) || 0) * factor * 10) / 10,
      isCustom: true,
      portions: portions.length > 0 ? portions : undefined,
    }
    onAddCustomFood(food)
    handleSelectFood(food)
    setShowCreateForm(false)
    // Reset form
    setCustomName('')
    setCustomRefAmount('100')
    setCustomCal('')
    setCustomProtein('')
    setCustomCarbs('')
    setCustomFat('')
    setCustomSugar('')
    setCustomPortions([])
    setNewPortionName('')
    setNewPortionGrams('')
  }

  if (showScanner) {
    return <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowScanner(false)} />
  }

  const gramsNum = parseFloat(grams) || 0
  const preview = selectedFood ? calcMacros(selectedFood, gramsNum) : null

  return (
    <div className="food-search-overlay" onClick={onClose}>
      <div ref={sheetRef} className="food-search-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="food-search-header">
          <h3 className="food-search-title">
            {selectedFood ? 'Set Amount' : `Add to ${MEAL_LABELS[meal]}`}
          </h3>
          <button className="food-search-close" onClick={onClose}>×</button>
        </div>

        {/* ── GRAMS SCREEN ── */}
        {selectedFood ? (
          <div className="food-grams-screen">
            <div className="food-selected-info">
              <div className="food-selected-name">{selectedFood.name}</div>
              {selectedFood.brand && (
                <div className="food-selected-brand">{selectedFood.brand}</div>
              )}
              <div className="food-per100g">
                Per 100g: {selectedFood.caloriesPer100g} kcal · P {selectedFood.proteinPer100g}g · C {selectedFood.carbsPer100g}g · F {selectedFood.fatPer100g}g
              </div>
            </div>

            {/* Portion quick-select chips */}
            {selectedFood.portions && selectedFood.portions.length > 0 && (
              <div className="portion-chips-section">
                <span className="portion-chips-label">Quick portions</span>
                <div className="portion-chips">
                  {selectedFood.portions.map(p => (
                    <button
                      key={p.name}
                      className={`portion-chip${parseFloat(grams) === p.grams ? ' active' : ''}`}
                      onClick={() => setGrams(String(p.grams))}
                    >
                      {p.name}
                      <span className="portion-chip-grams">{p.grams}g</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="food-grams-input-row">
              <label className="food-grams-label">Amount</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  className="input food-grams-input"
                  type="number"
                  inputMode="decimal"
                  value={grams}
                  onChange={e => setGrams(e.target.value)}
                  autoFocus
                />
                <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-tertiary)', flexShrink: 0 }}>g</span>
              </div>
            </div>

            {preview && (
              <div className="food-macros-preview">
                <div className="macro-preview-item macro-calories">
                  <span className="macro-preview-val">{Math.round(preview.calories)}</span>
                  <span className="macro-preview-label">kcal</span>
                </div>
                <div className="macro-preview-item">
                  <span className="macro-preview-val">{preview.protein}g</span>
                  <span className="macro-preview-label">Protein</span>
                </div>
                <div className="macro-preview-item">
                  <span className="macro-preview-val">{preview.carbs}g</span>
                  <span className="macro-preview-label">Carbs</span>
                </div>
                <div className="macro-preview-item">
                  <span className="macro-preview-val">{preview.fat}g</span>
                  <span className="macro-preview-label">Fat</span>
                </div>
              </div>
            )}

            <div className="food-grams-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedFood(null)}>Back</button>
              <button className="btn btn-primary" onClick={handleAddEntry}>Add Food</button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="food-search-tabs">
              <button
                className={`food-tab ${tab === 'search' ? 'active' : ''}`}
                onClick={() => setTab('search')}
              >
                Search
              </button>
              <button
                className={`food-tab ${tab === 'my-foods' ? 'active' : ''}`}
                onClick={() => setTab('my-foods')}
              >
                My Foods
              </button>
            </div>

            {/* ── SEARCH TAB ── */}
            {tab === 'search' ? (
              <>
                <div className="food-search-input-row">
                  <input
                    className="input food-search-input"
                    placeholder="Search foods..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="food-barcode-btn"
                    onClick={() => setShowScanner(true)}
                    title="Scan barcode"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="2" y="3" width="4" height="18" rx="0.5"/>
                      <rect x="8" y="3" width="2" height="18" rx="0.5"/>
                      <rect x="12" y="3" width="3" height="18" rx="0.5"/>
                      <rect x="17" y="3" width="2" height="18" rx="0.5"/>
                      <rect x="21" y="3" width="1" height="18" rx="0.5"/>
                    </svg>
                  </button>
                </div>

                {isSearching && (
                  <div className="food-search-loading">Searching...</div>
                )}

                <div className="food-results-list">
                  {!isSearching && query.trim() && results.length === 0 && (
                    <p className="food-no-results">No results for "{query}"</p>
                  )}

                  {/* Recents — shown when query is empty */}
                  {!query.trim() && recentFoods.length > 0 && (
                    <>
                      <p className="food-recents-label">Recently used</p>
                      {recentFoods.map((food) => (
                        <button
                          key={food.id}
                          className="food-result-item"
                          onClick={() => handleSelectFood(food)}
                        >
                          <div className="food-result-name">{food.name}</div>
                          {food.brand && <div className="food-result-brand">{food.brand}</div>}
                          <div className="food-result-macros">
                            {food.caloriesPer100g} kcal · P {food.proteinPer100g}g · C {food.carbsPer100g}g · F {food.fatPer100g}g (per 100g)
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {!query.trim() && recentFoods.length === 0 && (
                    <p className="food-search-hint">Type to search or scan a barcode</p>
                  )}

                  {/* API results */}
                  {results.map((p, i) => (
                    <button
                      key={i}
                      className="food-result-item"
                      onClick={() => handleSelectFood(offToFoodItem(p))}
                    >
                      <div className="food-result-name">{p.name}</div>
                      {p.brand && <div className="food-result-brand">{p.brand}</div>}
                      <div className="food-result-macros">
                        {p.caloriesPer100g} kcal · P {p.proteinPer100g}g · C {p.carbsPer100g}g · F {p.fatPer100g}g (per 100g)
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* ── MY FOODS TAB ── */
              <div className="my-foods-content">
                <button
                  className="btn btn-secondary my-foods-create-btn"
                  onClick={() => setShowCreateForm(v => !v)}
                >
                  {showCreateForm ? 'Cancel' : '+ Create Custom Food'}
                </button>

                {showCreateForm && (
                  <div className="custom-food-form">
                    <input
                      className="input"
                      placeholder="Food name *"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      autoFocus
                    />

                    {/* Reference amount */}
                    <div className="custom-food-ref-row">
                      <span className="custom-food-ref-label">Macros are for</span>
                      <input
                        className="input custom-food-ref-input"
                        type="number"
                        inputMode="decimal"
                        value={customRefAmount}
                        onChange={e => setCustomRefAmount(e.target.value)}
                      />
                      <span className="custom-food-ref-unit">g</span>
                    </div>

                    <div className="custom-food-macros-grid">
                      {[
                        { label: 'Calories (kcal)', val: customCal, set: setCustomCal },
                        { label: 'Protein (g)', val: customProtein, set: setCustomProtein },
                        { label: 'Carbs (g)', val: customCarbs, set: setCustomCarbs },
                        { label: 'Fat (g)', val: customFat, set: setCustomFat },
                        { label: 'Sugar (g)', val: customSugar, set: setCustomSugar },
                      ].map(({ label, val, set }) => (
                        <div key={label} className="custom-macro-input">
                          <label>{label}</label>
                          <input
                            className="input"
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={val}
                            onChange={e => set(e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Portions */}
                    <div className="custom-portions-section">
                      <span className="custom-portions-label">Portions (optional)</span>

                      {customPortions.length > 0 && (
                        <div className="custom-portions-list">
                          {customPortions.map((p, i) => (
                            <div key={i} className="custom-portion-item">
                              <span className="custom-portion-text">{p.name} — {p.grams}g</span>
                              <button
                                className="custom-portion-delete"
                                onClick={() => setCustomPortions(prev => prev.filter((_, j) => j !== i))}
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="custom-portion-add-row">
                        <input
                          className="input"
                          placeholder='e.g. "1 slice"'
                          value={newPortionName}
                          onChange={e => setNewPortionName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddPortion() }}
                        />
                        <input
                          className="input custom-portion-grams-input"
                          type="number"
                          inputMode="decimal"
                          placeholder="g"
                          value={newPortionGrams}
                          onChange={e => setNewPortionGrams(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddPortion() }}
                        />
                        <button
                          className="btn btn-secondary custom-portion-add-btn"
                          onClick={handleAddPortion}
                          disabled={!newPortionName.trim() || !newPortionGrams}
                        >+</button>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleCreateCustomFood}
                      disabled={!customName.trim()}
                    >
                      Save & Select
                    </button>
                  </div>
                )}

                <div className="food-results-list">
                  {customFoods.length === 0 ? (
                    <p className="food-search-hint">No custom foods yet. Create one above.</p>
                  ) : (
                    customFoods.map(food => (
                      <div key={food.id} className="food-result-item my-food-item">
                        <button className="my-food-select" onClick={() => handleSelectFood(food)}>
                          <div className="food-result-name">{food.name}</div>
                          <div className="food-result-macros">
                            {food.caloriesPer100g} kcal · P {food.proteinPer100g}g · C {food.carbsPer100g}g · F {food.fatPer100g}g (per 100g)
                          </div>
                          {food.portions && food.portions.length > 0 && (
                            <div className="food-result-portions">
                              {food.portions.map(p => p.name).join(' · ')}
                            </div>
                          )}
                        </button>
                        <button className="my-food-delete" onClick={() => onDeleteCustomFood(food.id)}>×</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

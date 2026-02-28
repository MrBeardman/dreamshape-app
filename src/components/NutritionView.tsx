import { useState, useMemo } from 'react'
import type { NutritionLog, MealEntry, FoodItem, UserProfile } from '../types'
import FoodSearchSheet from './FoodSearchSheet'

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

interface NutritionViewProps {
  nutritionLogs: NutritionLog[]
  customFoods: FoodItem[]
  userProfile: UserProfile
  onAddEntry: (date: string, entry: MealEntry) => void
  onDeleteEntry: (date: string, entryId: string) => void
  onAddCustomFood: (food: FoodItem) => void
  onDeleteCustomFood: (foodId: string) => void
}

const MEALS: Array<{ key: Meal; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
]

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function NutritionView({
  nutritionLogs,
  customFoods,
  userProfile,
  onAddEntry,
  onDeleteEntry,
  onAddCustomFood,
  onDeleteCustomFood,
}: NutritionViewProps) {
  const [selectedDate, setSelectedDate] = useState(getToday)
  const [addingToMeal, setAddingToMeal] = useState<Meal | null>(null)

  const isToday = selectedDate === getToday()

  const todayLog = useMemo(
    () => nutritionLogs.find(l => l.date === selectedDate),
    [nutritionLogs, selectedDate]
  )

  const goals = userProfile.nutritionGoals

  const totals = useMemo(() => {
    const entries = todayLog?.entries ?? []
    return {
      calories: Math.round(entries.reduce((s, e) => s + e.calories, 0)),
      protein: Math.round(entries.reduce((s, e) => s + e.protein, 0) * 10) / 10,
      carbs: Math.round(entries.reduce((s, e) => s + e.carbs, 0) * 10) / 10,
      fat: Math.round(entries.reduce((s, e) => s + e.fat, 0) * 10) / 10,
      sugar: Math.round(entries.reduce((s, e) => s + e.sugar, 0) * 10) / 10,
    }
  }, [todayLog])

  const navigateDate = (dir: -1 | 1) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + dir)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  // Calories ring math
  const r = 52
  const circumference = 2 * Math.PI * r
  const calPct = goals?.calories ? Math.min(totals.calories / goals.calories, 1) : 0
  const strokeDashoffset = circumference * (1 - calPct)

  const macros = [
    { label: 'Protein', val: totals.protein, goal: goals?.protein, color: '#4ade80' },
    { label: 'Carbs', val: totals.carbs, goal: goals?.carbs, color: '#60a5fa' },
    { label: 'Fat', val: totals.fat, goal: goals?.fat, color: '#f97316' },
    { label: 'Sugar', val: totals.sugar, goal: goals?.sugar, color: '#c084fc' },
  ]

  return (
    <div className="nutrition-view">
      {/* Header */}
      <div className="nutrition-header">
        <h1 className="view-title">Nutrition</h1>
      </div>

      {/* Date Navigation */}
      <div className="nutrition-date-nav">
        <button className="date-nav-btn" onClick={() => navigateDate(-1)}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 5l-5 5 5 5"/>
          </svg>
        </button>
        <div className="date-nav-center">
          <span className="date-nav-label">{isToday ? 'Today' : formatDateLabel(selectedDate)}</span>
          {!isToday && (
            <button className="date-nav-today-btn" onClick={() => setSelectedDate(getToday())}>
              Back to Today
            </button>
          )}
        </div>
        <button className="date-nav-btn" onClick={() => navigateDate(1)}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 5l5 5-5 5"/>
          </svg>
        </button>
      </div>

      {/* Daily Summary */}
      <div className="nutrition-summary-card">
        {/* Calories Ring */}
        <div className="nutrition-cal-ring-section">
          <svg className="cal-ring-svg" viewBox="0 0 130 130">
            <circle className="cal-ring-bg" cx="65" cy="65" r={r} />
            <circle
              className="cal-ring-fill"
              cx="65" cy="65" r={r}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="cal-ring-center">
            <span className="cal-ring-number">{totals.calories}</span>
            <span className="cal-ring-unit">kcal</span>
            {goals && (
              <span className="cal-ring-goal">of {goals.calories}</span>
            )}
          </div>
        </div>

        {/* Macro Bars */}
        <div className="nutrition-macro-bars">
          {macros.map(({ label, val, goal, color }) => (
            <div key={label} className="macro-bar-row">
              <span className="macro-bar-label">{label}</span>
              <div className="macro-bar-track">
                <div
                  className="macro-bar-fill"
                  style={{
                    width: goal ? `${Math.min(val / goal * 100, 100)}%` : '0%',
                    background: color,
                  }}
                />
              </div>
              <span className="macro-bar-value">
                {val}g{goal ? ` / ${goal}g` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Meal Sections */}
      {MEALS.map(({ key, label }) => {
        const entries = (todayLog?.entries ?? []).filter(e => e.meal === key)
        const mealCals = Math.round(entries.reduce((s, e) => s + e.calories, 0))

        return (
          <div key={key} className="meal-section">
            <div className="meal-section-header">
              <div className="meal-title-group">
                <span className="meal-name">{label}</span>
                {entries.length > 0 && (
                  <span className="meal-cal-badge">{mealCals} kcal</span>
                )}
              </div>
              <button className="meal-add-btn" onClick={() => setAddingToMeal(key)}>
                + Add
              </button>
            </div>

            {entries.length > 0 ? (
              <div className="meal-entry-list">
                {entries.map(entry => (
                  <div key={entry.id} className="meal-entry">
                    <div className="meal-entry-info">
                      <span className="meal-entry-name">
                        {entry.foodName}{entry.brand ? ` · ${entry.brand}` : ''}
                      </span>
                      <span className="meal-entry-meta">
                        {entry.grams}g · {Math.round(entry.calories)} kcal · P {Math.round(entry.protein * 10) / 10}g · C {Math.round(entry.carbs * 10) / 10}g · F {Math.round(entry.fat * 10) / 10}g
                      </span>
                    </div>
                    <button
                      className="meal-entry-delete"
                      onClick={() => onDeleteEntry(selectedDate, entry.id)}
                      title="Remove entry"
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 6l8 8M14 6l-8 8"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="meal-empty-row">
                <span className="meal-empty-text">Nothing logged</span>
              </div>
            )}
          </div>
        )
      })}

      {/* Food Search Sheet */}
      {addingToMeal && (
        <FoodSearchSheet
          meal={addingToMeal}
          customFoods={customFoods}
          onAdd={(entry) => {
            onAddEntry(selectedDate, entry)
            setAddingToMeal(null)
          }}
          onAddCustomFood={onAddCustomFood}
          onDeleteCustomFood={onDeleteCustomFood}
          onClose={() => setAddingToMeal(null)}
        />
      )}
    </div>
  )
}

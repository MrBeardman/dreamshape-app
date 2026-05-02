import { useState, useMemo } from 'react'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'

interface ExerciseEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface ExercisesViewProps {
  exerciseDatabase: ExerciseEntry[]
  onAddToDatabase: (exercise: ExerciseEntry) => void
  onDeleteFromDatabase: (name: string) => void
}

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other']
const DEFAULT_NAMES = new Set(DEFAULT_EXERCISES.map(e => e.name))

export default function ExercisesView({ exerciseDatabase, onAddToDatabase, onDeleteFromDatabase }: ExercisesViewProps) {
  const [filterGroup, setFilterGroup] = useState('All')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState('Chest')
  const [newEquipment, setNewEquipment] = useState('Barbell')

  const filtered = useMemo(() => {
    return exerciseDatabase.filter(ex => {
      const matchGroup = filterGroup === 'All' || ex.muscleGroup === filterGroup
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
      return matchGroup && matchSearch
    })
  }, [exerciseDatabase, filterGroup, search])

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    if (exerciseDatabase.some(e => e.name.toLowerCase() === name.toLowerCase())) return
    onAddToDatabase({ name, muscleGroup: newMuscle, equipment: newEquipment })
    setNewName('')
    setNewMuscle('Chest')
    setNewEquipment('Barbell')
    setShowAdd(false)
  }

  return (
    <div className="exercises-view">
      <div className="exercises-header">
        <h2 className="view-title">Exercises</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          + Add
        </button>
      </div>

      <input
        type="search"
        className="input exercises-search"
        placeholder="Search exercises…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="exercises-filter-row">
        {MUSCLE_GROUPS.map(g => (
          <button
            key={g}
            className={`filter-chip ${filterGroup === g ? 'active' : ''}`}
            onClick={() => setFilterGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="exercises-list">
        {filtered.length === 0 && (
          <p className="exercises-empty">No exercises found.</p>
        )}
        {filtered.map(ex => {
          const isCustom = !DEFAULT_NAMES.has(ex.name)
          return (
            <div key={ex.name} className="exercise-row">
              <div className="exercise-row-info">
                <span className="exercise-row-name">{ex.name}</span>
                <span className="exercise-row-meta">{ex.muscleGroup} · {ex.equipment}</span>
              </div>
              {isCustom && (
                <button
                  className="btn-remove-exercise"
                  onClick={() => onDeleteFromDatabase(ex.name)}
                  title="Delete custom exercise"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="exercises-count">
        {filtered.length} of {exerciseDatabase.length} exercises
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h3 className="modal-sheet-title">New Exercise</h3>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Bulgarian Split Squat"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Muscle Group</label>
              <select className="input" value={newMuscle} onChange={e => setNewMuscle(e.target.value)}>
                {['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Equipment</label>
              <select className="input" value={newEquipment} onChange={e => setNewEquipment(e.target.value)}>
                {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Resistance Band', 'Other'].map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            <div className="modal-sheet-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
                Add Exercise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

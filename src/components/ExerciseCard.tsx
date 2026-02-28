import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ExerciseLog } from '../types'

interface ExerciseCardProps {
  exercise: ExerciseLog
  exerciseIndex: number
  pr: number
  lastWorkoutSets?: Array<{ weight: number; reps: number }>
  exerciseRestDuration: number
  activeRestTimer: { exerciseIndex: number; afterSetIndex: number; timeRemaining: number } | null
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => void
  onToggleSetCompleted: (exerciseIndex: number, setIndex: number) => void
  onAddSet: (exerciseIndex: number) => void
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void
  onSetExerciseRestDuration: (exerciseIndex: number, duration: number) => void
  onSkipInlineRest: () => void
  onRemoveExercise: (exerciseIndex: number) => void
  onSetExerciseNotes: (exerciseIndex: number, notes: string) => void
  onToggleSetType: (exerciseIndex: number, setIndex: number) => void
  formatRestTime: (seconds: number) => string
  exerciseDatabase?: Array<{ name: string; muscleGroup: string; equipment: string }>
  onSwitchExercise?: (exerciseIndex: number, name: string, muscleGroup: string, equipment: string) => void
  onCreateAndSwitchExercise?: (exerciseIndex: number, name: string, muscleGroup: string, equipment: string) => void
  onViewExerciseHistory?: (exerciseName: string) => void
}

export default function ExerciseCard({
  exercise,
  exerciseIndex,
  pr,
  lastWorkoutSets,
  exerciseRestDuration,
  activeRestTimer,
  onUpdateSet,
  onToggleSetCompleted,
  onAddSet,
  onRemoveSet,
  onSetExerciseRestDuration,
  onSkipInlineRest,
  onRemoveExercise,
  onSetExerciseNotes,
  onToggleSetType,
  formatRestTime,
  exerciseDatabase,
  onSwitchExercise,
  onCreateAndSwitchExercise,
  onViewExerciseHistory,
}: ExerciseCardProps) {
  const [showNotesMenu, setShowNotesMenu] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState(exercise.notes || '')
  const [prFlashSetId, setPrFlashSetId] = useState<string | null>(null)
  const [showSwitchPanel, setShowSwitchPanel] = useState(false)
  const [switchInput, setSwitchInput] = useState('')
  const [switchShowCreate, setSwitchShowCreate] = useState(false)
  const [switchNewMuscle, setSwitchNewMuscle] = useState('Other')
  const [switchNewEquip, setSwitchNewEquip] = useState('Barbell')
  const menuRef = useRef<HTMLDivElement>(null)

  const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other']
  const EQUIPMENT_OPTIONS = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other']

  // Close context menu when clicking outside
  useEffect(() => {
    if (!showNotesMenu) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNotesMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [showNotesMenu])

  const getSwitchSuggestions = () => {
    if (!exerciseDatabase) return {}
    const term = switchInput.toLowerCase().trim()
    const filtered = term
      ? exerciseDatabase.filter(ex =>
          ex.name.toLowerCase().includes(term) ||
          ex.muscleGroup.toLowerCase().includes(term)
        )
      : exerciseDatabase
    const grouped: Record<string, typeof filtered> = {}
    filtered.forEach(ex => {
      if (!grouped[ex.muscleGroup]) grouped[ex.muscleGroup] = []
      grouped[ex.muscleGroup].push(ex)
    })
    return grouped
  }

  const handleSwitch = (name: string, muscleGroup: string, equipment: string) => {
    onSwitchExercise?.(exerciseIndex, name, muscleGroup, equipment)
    setShowSwitchPanel(false)
    setSwitchInput('')
    setSwitchShowCreate(false)
  }

  const handleCreateAndSwitch = () => {
    onCreateAndSwitchExercise?.(exerciseIndex, switchInput.trim(), switchNewMuscle, switchNewEquip)
    setShowSwitchPanel(false)
    setSwitchInput('')
    setSwitchShowCreate(false)
    setSwitchNewMuscle('Other')
    setSwitchNewEquip('Barbell')
  }

  const closeSwitchPanel = () => {
    setShowSwitchPanel(false)
    setSwitchInput('')
    setSwitchShowCreate(false)
    setSwitchNewMuscle('Other')
    setSwitchNewEquip('Barbell')
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.exerciseId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleSaveNotes = () => {
    onSetExerciseNotes(exerciseIndex, notesText)
    setIsEditingNotes(false)
    setShowNotesMenu(false)
  }

  const handleToggleSet = (setIndex: number) => {
    const set = exercise.sets[setIndex]
    if (!set.completed && set.weight > 0 && pr > 0 && set.weight > pr) {
      setPrFlashSetId(set.id)
      setTimeout(() => setPrFlashSetId(null), 2500)
    }
    onToggleSetCompleted(exerciseIndex, setIndex)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`workout-exercise ${isDragging ? 'dragging' : ''}`}
    >
      <div className="exercise-header">
        <div className="exercise-header-left">
          <select
            className="exercise-rest-select"
            value={exerciseRestDuration}
            onChange={(e) => { e.stopPropagation(); onSetExerciseRestDuration(exerciseIndex, Number(e.target.value)) }}
            onClick={(e) => e.stopPropagation()}
            title="Rest duration for this exercise"
          >
            <option value={60}>1:00</option>
            <option value={90}>1:30</option>
            <option value={120}>2:00</option>
            <option value={180}>3:00</option>
            <option value={240}>4:00</option>
            <option value={300}>5:00</option>
          </select>
          <h3 className="exercise-title">{exercise.exerciseName}</h3>
        </div>
        <div className="exercise-header-actions">
          {pr > 0 && <span className="pr-badge">PR: {pr} kg</span>}
          <div className="exercise-menu-container" ref={menuRef}>
            <button
              className="btn-exercise-menu"
              onClick={(e) => { e.stopPropagation(); setShowNotesMenu(!showNotesMenu) }}
              title="Exercise options"
            >
              ⋮
            </button>
            {showNotesMenu && (
              <div className="exercise-menu-dropdown">
                <button
                  className="menu-item"
                  onClick={(e) => { e.stopPropagation(); setIsEditingNotes(true); setShowNotesMenu(false) }}
                >
                  {exercise.notes ? 'Edit note' : 'Add note'}
                </button>
                {onSwitchExercise && (
                  <button
                    className="menu-item"
                    onClick={(e) => { e.stopPropagation(); setShowSwitchPanel(true); setShowNotesMenu(false) }}
                  >
                    Switch exercise
                  </button>
                )}
                {onViewExerciseHistory && (
                  <button
                    className="menu-item"
                    onClick={(e) => { e.stopPropagation(); onViewExerciseHistory(exercise.exerciseName); setShowNotesMenu(false) }}
                  >
                    View Progress
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            className="btn-remove-exercise"
            onClick={(e) => { e.stopPropagation(); onRemoveExercise(exerciseIndex) }}
            title="Remove exercise"
          >
            ×
          </button>
        </div>
      </div>

      {/* Switch Exercise Panel */}
      {showSwitchPanel && (
        <div className="switch-exercise-panel" onClick={(e) => e.stopPropagation()}>
          <div className="switch-exercise-header">
            <span className="switch-exercise-title">Switch Exercise</span>
            <button
              className="btn-notes-cancel"
              onClick={(e) => { e.stopPropagation(); closeSwitchPanel() }}
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            className="input"
            placeholder="Search exercises..."
            value={switchInput}
            onChange={(e) => setSwitchInput(e.target.value)}
            autoFocus
          />
          <div className="switch-search-results">
            {Object.entries(getSwitchSuggestions()).map(([group, groupExercises]) => (
              <div key={group}>
                <div className="suggestion-group-header">{group}</div>
                {groupExercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="suggestion-item"
                    onClick={(e) => { e.stopPropagation(); handleSwitch(ex.name, ex.muscleGroup, ex.equipment) }}
                  >
                    <span className="suggestion-name">{ex.name}</span>
                    <span className="suggestion-meta">{ex.muscleGroup} · {ex.equipment}</span>
                  </div>
                ))}
              </div>
            ))}
            {switchInput.trim() && !exerciseDatabase?.some(ex => ex.name.toLowerCase() === switchInput.trim().toLowerCase()) && (
              <div className="suggestion-create-section">
                {!switchShowCreate ? (
                  <div
                    className="suggestion-item suggestion-create"
                    onClick={(e) => { e.stopPropagation(); setSwitchShowCreate(true) }}
                  >
                    <span className="suggestion-name">+ Create "{switchInput.trim()}"</span>
                    <span className="suggestion-meta">Add to library & switch</span>
                  </div>
                ) : (
                  <div className="create-exercise-inline" onClick={(e) => e.stopPropagation()}>
                    <div className="create-exercise-name">"{switchInput.trim()}"</div>
                    <div className="create-exercise-selects">
                      <select
                        className="rest-select"
                        value={switchNewMuscle}
                        onChange={(e) => setSwitchNewMuscle(e.target.value)}
                      >
                        {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <select
                        className="rest-select"
                        value={switchNewEquip}
                        onChange={(e) => setSwitchNewEquip(e.target.value)}
                      >
                        {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                      </select>
                    </div>
                    <div className="create-exercise-actions">
                      <button
                        className="btn-notes-cancel"
                        onClick={(e) => { e.stopPropagation(); setSwitchShowCreate(false) }}
                      >
                        Back
                      </button>
                      <button
                        className="btn-notes-save"
                        onClick={(e) => { e.stopPropagation(); handleCreateAndSwitch() }}
                      >
                        Create & Switch
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercise Notes edit mode */}
      {isEditingNotes && (
        <div className="exercise-notes-edit" onClick={(e) => e.stopPropagation()}>
          <textarea
            className="notes-textarea"
            placeholder="Add a note for this exercise..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="notes-actions">
            <button
              className="btn-notes-cancel"
              onClick={(e) => { e.stopPropagation(); setIsEditingNotes(false); setNotesText(exercise.notes || '') }}
            >
              Cancel
            </button>
            <button
              className="btn-notes-save"
              onClick={(e) => { e.stopPropagation(); handleSaveNotes() }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {exercise.notes && !isEditingNotes && (
        <div className="exercise-notes-display" onClick={(e) => e.stopPropagation()}>
          <span className="notes-text">{exercise.notes}</span>
        </div>
      )}

      {lastWorkoutSets && lastWorkoutSets.length > 0 && (
        <div className="last-session-hint">
          Last: {lastWorkoutSets.map(s => `${s.weight}×${s.reps}`).join('  ·  ')}
        </div>
      )}

      <div className="sets-header">
        <span className="set-col">Set</span>
        <span className="kg-col">kg</span>
        <span className="reps-col">Reps</span>
        <span className="check-col">✓</span>
        <span></span>{/* spacer — aligns with remove-set-btn column */}
      </div>

      {exercise.sets.map((set, setIndex) => {
        const setType = set.type || 'working'
        const workingNumber = exercise.sets
          .slice(0, setIndex + 1)
          .filter(s => (s.type || 'working') === 'working').length

        return (
          <div key={set.id} style={{ position: 'relative' }}>
            <div className={`set-row ${set.completed ? 'completed' : ''}`}>
              <button
                className={`set-number-badge ${setType}`}
                onClick={(e) => { e.stopPropagation(); onToggleSetType(exerciseIndex, setIndex) }}
                title={`Click to toggle: ${setType === 'warmup' ? 'Warmup' : 'Working Set'}`}
              >
                {setType === 'warmup' ? 'W' : workingNumber}
              </button>

              <input
                type="number"
                inputMode="decimal"
                className="set-input"
                value={set.weight || ''}
                onChange={(e) => { e.stopPropagation(); onUpdateSet(exerciseIndex, setIndex, 'weight', Number(e.target.value)) }}
                onClick={(e) => e.stopPropagation()}
                placeholder={lastWorkoutSets?.[setIndex]?.weight ? String(lastWorkoutSets[setIndex].weight) : '0'}
              />

              <input
                type="number"
                inputMode="numeric"
                className="set-input"
                value={set.reps || ''}
                onChange={(e) => { e.stopPropagation(); onUpdateSet(exerciseIndex, setIndex, 'reps', Number(e.target.value)) }}
                onClick={(e) => e.stopPropagation()}
                placeholder={lastWorkoutSets?.[setIndex]?.reps ? String(lastWorkoutSets[setIndex].reps) : '0'}
              />

              <button
                className={`check-btn ${set.completed ? 'completed' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleToggleSet(setIndex) }}
              >
                {set.completed ? '✓' : ''}
              </button>

              {exercise.sets.length > 1 && (
                <button
                  className="remove-set-btn"
                  onClick={(e) => { e.stopPropagation(); onRemoveSet(exerciseIndex, setIndex) }}
                >
                  ×
                </button>
              )}
            </div>

            {prFlashSetId === set.id && (
              <div className="pr-flash">🏆 New PR!</div>
            )}

            {/* Inline Rest Timer */}
            {activeRestTimer &&
              activeRestTimer.exerciseIndex === exerciseIndex &&
              activeRestTimer.afterSetIndex === setIndex && (
                <div className="inline-rest-timer">
                  <div
                    className="inline-rest-progress"
                    style={{
                      width: `${((exerciseRestDuration - activeRestTimer.timeRemaining) / exerciseRestDuration) * 100}%`,
                    }}
                  />
                  <div className="inline-rest-content">
                    <span className="inline-rest-time">Rest: {formatRestTime(activeRestTimer.timeRemaining)}</span>
                    <button
                      className="inline-rest-skip"
                      onClick={(e) => { e.stopPropagation(); onSkipInlineRest() }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
          </div>
        )
      })}

      <button
        className="add-set-btn"
        onClick={(e) => { e.stopPropagation(); onAddSet(exerciseIndex) }}
      >
        + Add Set
      </button>
    </div>
  )
}

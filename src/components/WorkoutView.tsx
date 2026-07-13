import { useState, useRef, useEffect } from 'react'
import type { ActiveWorkout, WorkoutLog } from '../types'
import ExerciseCard from './ExerciseCard'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface WorkoutViewProps {
  activeWorkout: ActiveWorkout
  elapsedTime: number
  restDuration: number
  activeRestTimer: { exerciseIndex: number; afterSetIndex: number; timeRemaining: number } | null
  workoutLogs: WorkoutLog[]
  exerciseDatabase: ExerciseDbEntry[]
  onCancel: () => void
  onFinish: () => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => void
  onToggleSetCompleted: (exerciseIndex: number, setIndex: number) => void
  onAddSet: (exerciseIndex: number) => void
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void
  onSetRestDuration: (duration: number) => void
  onSetExerciseRestDuration: (exerciseIndex: number, duration: number) => void
  onSkipInlineRest: () => void
  onAddExercise: (name: string, muscleGroup: string, equipment: string) => void
  onRemoveExercise: (exerciseIndex: number) => void
  onReorderExercises: (oldIndex: number, newIndex: number) => void
  onSetWorkoutNotes: (notes: string) => void
  onSetExerciseNotes: (exerciseIndex: number, notes: string) => void
  onToggleSetType: (exerciseIndex: number, setIndex: number) => void
  onCreateAndAddExercise: (name: string, muscleGroup: string, equipment: string) => void
  onSwitchExercise: (exerciseIndex: number, name: string, muscleGroup: string, equipment: string) => void
  onCreateAndSwitchExercise: (exerciseIndex: number, name: string, muscleGroup: string, equipment: string) => void
  onViewExerciseHistory?: (exerciseName: string) => void
  onMinimize: () => void
}

export default function WorkoutView({
  activeWorkout,
  elapsedTime,
  restDuration,
  activeRestTimer,
  workoutLogs,
  exerciseDatabase,
  onCancel,
  onFinish,
  onUpdateSet,
  onToggleSetCompleted,
  onAddSet,
  onRemoveSet,
  onSetRestDuration,
  onSetExerciseRestDuration,
  onSkipInlineRest,
  onAddExercise,
  onRemoveExercise,
  onReorderExercises,
  onSetWorkoutNotes,
  onSetExerciseNotes,
  onToggleSetType,
  onCreateAndAddExercise,
  onSwitchExercise,
  onCreateAndSwitchExercise,
  onViewExerciseHistory,
  onMinimize,
}: WorkoutViewProps) {
  const [exerciseInput, setExerciseInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showWorkoutNotes, setShowWorkoutNotes] = useState(false)
  const [workoutNotesText, setWorkoutNotesText] = useState(activeWorkout.notes || '')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newExMuscle, setNewExMuscle] = useState('Other')
  const [newExEquip, setNewExEquip] = useState('Barbell')
  const addExerciseRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const createFormRef = useRef<HTMLDivElement>(null)
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined)
  const [scrollSpacer, setScrollSpacer] = useState(0)
  const showCreateFormRef = useRef(showCreateForm)
  showCreateFormRef.current = showCreateForm

  // The Add Exercise section sits at the very bottom of the page, so there's
  // normally nothing below it for scrollIntoView to scroll into — the keyboard
  // shrinks the visible (visual) viewport without shrinking the scrollable
  // (layout) viewport, so the browser has no room to bring it above the
  // keyboard. Reserve a full viewport of scratch room so it always can.
  useEffect(() => {
    if (!showSuggestions) {
      setScrollSpacer(0)
      return
    }
    setScrollSpacer(window.innerHeight)
    const id = setTimeout(() => {
      addExerciseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)
    return () => clearTimeout(id)
  }, [showSuggestions])

  // Keep the suggestions dropdown from extending past whatever space the
  // on-screen keyboard leaves above it.
  useEffect(() => {
    if (!showSuggestions) return

    const vv = window.visualViewport
    const updateMaxHeight = () => {
      if (!dropdownRef.current) return
      const viewportHeight = vv?.height ?? window.innerHeight
      const offsetTop = vv?.offsetTop ?? 0
      const top = dropdownRef.current.getBoundingClientRect().top - offsetTop
      const available = viewportHeight - top - 16
      setDropdownMaxHeight(Math.max(120, Math.min(280, available)))
    }

    updateMaxHeight()
    vv?.addEventListener('resize', updateMaxHeight)
    vv?.addEventListener('scroll', updateMaxHeight)
    window.addEventListener('resize', updateMaxHeight)
    window.addEventListener('scroll', updateMaxHeight, { passive: true })
    return () => {
      vv?.removeEventListener('resize', updateMaxHeight)
      vv?.removeEventListener('scroll', updateMaxHeight)
      window.removeEventListener('resize', updateMaxHeight)
      window.removeEventListener('scroll', updateMaxHeight)
    }
  }, [showSuggestions])

  // When the create form expands, scroll its buttons into view within the
  // dropdown's own scroll area so they stay reachable above the keyboard.
  useEffect(() => {
    if (showCreateForm) {
      setTimeout(() => {
        createFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [showCreateForm])

  const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other']
  const EQUIPMENT_OPTIONS = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other']

  const getGroupedSuggestions = () => {
    const searchTerm = exerciseInput.toLowerCase().trim()
    
    const filtered = searchTerm
      ? exerciseDatabase.filter(ex =>
          ex.name.toLowerCase().includes(searchTerm) ||
          ex.muscleGroup.toLowerCase().includes(searchTerm)
        )
      : exerciseDatabase

    const grouped: Record<string, ExerciseDbEntry[]> = {}
    filtered.forEach(ex => {
      if (!grouped[ex.muscleGroup]) {
        grouped[ex.muscleGroup] = []
      }
      grouped[ex.muscleGroup].push(ex)
    })

    return grouped
  }

  const handleAddExercise = (name: string, muscleGroup: string, equipment: string) => {
    onAddExercise(name, muscleGroup, equipment)
    setExerciseInput('')
    setShowSuggestions(false)
  }
  
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getLastWorkoutSets = (exerciseName: string) => {
    for (const workout of workoutLogs) {
      const exercise = workout.exercises.find(e => e.exerciseName === exerciseName)
      if (exercise && exercise.sets.length > 0) {
        return exercise.sets.map(s => ({ weight: s.weight, reps: s.reps }))
      }
    }
    return undefined
  }

  const getPersonalRecord = (exerciseName: string): number => {
    let maxWeight = 0
    
    workoutLogs.forEach(workout => {
      const exercise = workout.exercises.find(e => e.exerciseName === exerciseName)
      if (exercise) {
        exercise.sets.forEach(set => {
          if (set.weight > maxWeight) {
            maxWeight = set.weight
          }
        })
      }
    })
    
    return maxWeight
  }

  const handleSaveWorkoutNotes = () => {
    onSetWorkoutNotes(workoutNotesText)
    setShowWorkoutNotes(false)
  }

  return (
    <div className="workout-view">
      {/* Sticky Header */}
      <div className="workout-header-sticky">
        <button className="btn-back" onClick={onCancel}>
          ✕
        </button>
        <span className="workout-time">{formatElapsedTime(elapsedTime)}</span>
        <button className="btn-minimize-workout" onClick={onMinimize} title="Minimize">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="3" y1="8" x2="13" y2="8"/>
          </svg>
        </button>
        <button className="btn-finish" onClick={onFinish}>
          Finish
        </button>
      </div>

      {/* Workout Title & Notes */}
      <div className="workout-title-section">
        <h2>{activeWorkout.templateName}</h2>
        <button 
          className="btn-workout-notes"
          onClick={() => setShowWorkoutNotes(!showWorkoutNotes)}
        >
          {activeWorkout.notes ? 'Edit notes' : 'Add notes'}
        </button>
      </div>

      {showWorkoutNotes && (
        <div className="workout-notes-edit">
          <textarea
            className="notes-textarea"
            placeholder="Add notes for this workout..."
            value={workoutNotesText}
            onChange={(e) => setWorkoutNotesText(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="notes-actions">
            <button
              className="btn-notes-cancel"
              onClick={() => {
                setShowWorkoutNotes(false)
                setWorkoutNotesText(activeWorkout.notes || '')
              }}
            >
              Cancel
            </button>
            <button
              className="btn-notes-save"
              onClick={handleSaveWorkoutNotes}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {activeWorkout.notes && !showWorkoutNotes && (
        <div className="workout-notes-display">
          <span className="notes-text">{activeWorkout.notes}</span>
        </div>
      )}

      {/* Rest Settings */}
      <div className="rest-settings-bar">
        <label className="rest-label-small">Default Rest: </label>
        <select 
          className="rest-select"
          value={restDuration}
          onChange={(e) => onSetRestDuration(Number(e.target.value))}
        >
          <option value={60}>1:00</option>
          <option value={90}>1:30</option>
          <option value={120}>2:00</option>
          <option value={180}>3:00</option>
          <option value={240}>4:00</option>
          <option value={300}>5:00</option>
        </select>
      </div>


      <div className="workout-exercises">
          {activeWorkout.exercises.length === 0 && (
            <div className="empty-workout-state">
              <p>No exercises yet. Add your first exercise below!</p>
            </div>
          )}

          {activeWorkout.exercises.map((exerciseLog, exerciseIndex) => (
            <ExerciseCard
              key={exerciseLog.exerciseId}
              exercise={exerciseLog}
              exerciseIndex={exerciseIndex}
              pr={getPersonalRecord(exerciseLog.exerciseName)}
              lastWorkoutSets={getLastWorkoutSets(exerciseLog.exerciseName)}
              exerciseRestDuration={exerciseLog.restDuration || restDuration}
              activeRestTimer={activeRestTimer}
              exerciseDatabase={exerciseDatabase}
              onUpdateSet={onUpdateSet}
              onToggleSetCompleted={onToggleSetCompleted}
              onAddSet={onAddSet}
              onRemoveSet={onRemoveSet}
              onSetExerciseRestDuration={onSetExerciseRestDuration}
              onSkipInlineRest={onSkipInlineRest}
              onRemoveExercise={onRemoveExercise}
              onSetExerciseNotes={onSetExerciseNotes}
              onToggleSetType={onToggleSetType}
              formatRestTime={formatRestTime}
              onSwitchExercise={onSwitchExercise}
              onCreateAndSwitchExercise={onCreateAndSwitchExercise}
              onViewExerciseHistory={onViewExerciseHistory}
              isFirst={exerciseIndex === 0}
              isLast={exerciseIndex === activeWorkout.exercises.length - 1}
              onMoveUp={() => onReorderExercises(exerciseIndex, exerciseIndex - 1)}
              onMoveDown={() => onReorderExercises(exerciseIndex, exerciseIndex + 1)}
            />
          ))}

          {/* Add Exercise Section */}
          <div ref={addExerciseRef} className="add-exercise-workout-section">
            <h3 className="add-exercise-title">Add Exercise</h3>
            <div className="exercise-input-container">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Tapping "+Create" (or its native <select> controls once open)
                  // blurs this input too, racing this same close-on-blur timer.
                  // Re-check at fire time so an open create-form always wins —
                  // it closes explicitly via Cancel / Add to Workout instead.
                  setTimeout(() => {
                    if (showCreateFormRef.current) return
                    setShowSuggestions(false)
                  }, 200)
                }}
                className="input"
              />
              {showSuggestions && (
                <div
                  ref={dropdownRef}
                  className="suggestions-dropdown"
                  style={dropdownMaxHeight ? { maxHeight: dropdownMaxHeight } : undefined}
                >
                  {Object.entries(getGroupedSuggestions()).map(([group, groupExercises]) => (
                    <div key={group}>
                      <div className="suggestion-group-header">{group}</div>
                      {groupExercises.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="suggestion-item"
                          onClick={() => handleAddExercise(
                            suggestion.name,
                            suggestion.muscleGroup,
                            suggestion.equipment
                          )}
                        >
                          <span className="suggestion-name">{suggestion.name}</span>
                          <span className="suggestion-meta">
                            {suggestion.muscleGroup} • {suggestion.equipment}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {exerciseInput.trim() && !exerciseDatabase.some(ex => ex.name.toLowerCase() === exerciseInput.trim().toLowerCase()) && (
                    <div className="suggestion-create-section">
                      {!showCreateForm ? (
                        <div
                          className="suggestion-item suggestion-create"
                          onClick={() => setShowCreateForm(true)}
                        >
                          <span className="suggestion-name">+ Create "{exerciseInput.trim()}"</span>
                          <span className="suggestion-meta">Add to library & workout</span>
                        </div>
                      ) : (
                        <div ref={createFormRef} className="create-exercise-inline" onClick={e => e.stopPropagation()}>
                          <div className="create-exercise-name">"{exerciseInput.trim()}"</div>
                          <div className="create-exercise-selects">
                            <select
                              className="rest-select"
                              value={newExMuscle}
                              onChange={e => setNewExMuscle(e.target.value)}
                            >
                              {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <select
                              className="rest-select"
                              value={newExEquip}
                              onChange={e => setNewExEquip(e.target.value)}
                            >
                              {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                            </select>
                          </div>
                          <div className="create-exercise-actions">
                            <button
                              className="btn-notes-cancel"
                              onClick={() => { setShowCreateForm(false); setNewExMuscle('Other'); setNewExEquip('Barbell') }}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn-notes-save"
                              onClick={() => {
                                onCreateAndAddExercise(exerciseInput.trim(), newExMuscle, newExEquip)
                                setExerciseInput('')
                                setShowSuggestions(false)
                                setShowCreateForm(false)
                                setNewExMuscle('Other')
                                setNewExEquip('Barbell')
                              }}
                            >
                              Add to Workout
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {scrollSpacer > 0 && <div style={{ height: scrollSpacer }} aria-hidden="true" />}
        </div>

      <div className="workout-footer">
        <button className="btn-finish-large" onClick={onFinish}>
          Finish Workout
        </button>
      </div>
    </div>
  )
}
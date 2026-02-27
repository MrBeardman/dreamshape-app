import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
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
}: WorkoutViewProps) {
  const [exerciseInput, setExerciseInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showWorkoutNotes, setShowWorkoutNotes] = useState(false)
  const [workoutNotesText, setWorkoutNotesText] = useState(activeWorkout.notes || '')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = activeWorkout.exercises.findIndex(ex => ex.exerciseId === active.id)
      const newIndex = activeWorkout.exercises.findIndex(ex => ex.exerciseId === over.id)
      
      onReorderExercises(oldIndex, newIndex)
    }
  }

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
          {activeWorkout.notes ? '📝 Edit notes' : '📝 Add notes'}
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
          <span className="notes-icon">📝</span>
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


      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="workout-exercises">
          {activeWorkout.exercises.length === 0 && (
            <div className="empty-workout-state">
              <p>No exercises yet. Add your first exercise below!</p>
            </div>
          )}

          <SortableContext
            items={activeWorkout.exercises.map(ex => ex.exerciseId)}
            strategy={verticalListSortingStrategy}
          >
            {activeWorkout.exercises.map((exerciseLog, exerciseIndex) => (
              <ExerciseCard
                key={exerciseLog.exerciseId}
                exercise={exerciseLog}
                exerciseIndex={exerciseIndex}
                pr={getPersonalRecord(exerciseLog.exerciseName)}
                exerciseRestDuration={exerciseLog.restDuration || restDuration}
                activeRestTimer={activeRestTimer}
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
              />
            ))}
          </SortableContext>

          {/* Add Exercise Section */}
          <div className="add-exercise-workout-section">
            <h3 className="add-exercise-title">Add Exercise</h3>
            <div className="exercise-input-container">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="input"
              />
              {showSuggestions && (
                <div className="suggestions-dropdown">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </DndContext>

      <div className="workout-footer">
        <button className="btn-finish-large" onClick={onFinish}>
          Finish Workout
        </button>
      </div>
    </div>
  )
}
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ActiveWorkout, WorkoutLog, ExerciseLog } from '../types'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface WorkoutViewProps {
  activeWorkout: ActiveWorkout
  elapsedTime: number
  restTimer: number | null
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
  onSkipRest: () => void
  onSkipInlineRest: () => void
  onAddExercise: (name: string, muscleGroup: string, equipment: string) => void
  onRemoveExercise: (exerciseIndex: number) => void
  onReorderExercises: (oldIndex: number, newIndex: number) => void
}

function SortableExercise({
  exercise,
  exerciseIndex,
  pr,
  exerciseRestDuration,
  activeRestTimer,
  onUpdateSet,
  onToggleSetCompleted,
  onAddSet,
  onRemoveSet,
  onSetExerciseRestDuration,
  onSkipInlineRest,
  onRemoveExercise,
  formatRestTime,
}: {
  exercise: ExerciseLog
  exerciseIndex: number
  pr: number
  exerciseRestDuration: number
  activeRestTimer: { exerciseIndex: number; afterSetIndex: number; timeRemaining: number } | null
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => void
  onToggleSetCompleted: (exerciseIndex: number, setIndex: number) => void
  onAddSet: (exerciseIndex: number) => void
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void
  onSetExerciseRestDuration: (exerciseIndex: number, duration: number) => void
  onSkipInlineRest: () => void
  onRemoveExercise: (exerciseIndex: number) => void
  formatRestTime: (seconds: number) => string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.exerciseId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
            onChange={(e) => {
              e.stopPropagation()
              onSetExerciseRestDuration(exerciseIndex, Number(e.target.value))
            }}
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
          {pr > 0 && (
            <span className="pr-badge">PR: {pr} kg</span>
          )}
          <button
            className="btn-remove-exercise"
            onClick={(e) => {
              e.stopPropagation()
              onRemoveExercise(exerciseIndex)
            }}
            title="Remove exercise"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className="sets-header">
        <span className="set-col">Set</span>
        <span className="kg-col">kg</span>
        <span className="reps-col">Reps</span>
        <span className="check-col">✓</span>
      </div>

      {exercise.sets.map((set, setIndex) => (
        <div key={set.id}>
          <div className={`set-row ${set.completed ? 'completed' : ''}`}>
            <span className="set-number">{setIndex + 1}</span>
            
            <input
              type="number"
              className="set-input"
              value={set.weight || ''}
              onChange={(e) => {
                e.stopPropagation()
                onUpdateSet(exerciseIndex, setIndex, 'weight', Number(e.target.value))
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="0"
            />
            
            <input
              type="number"
              className="set-input"
              value={set.reps || ''}
              onChange={(e) => {
                e.stopPropagation()
                onUpdateSet(exerciseIndex, setIndex, 'reps', Number(e.target.value))
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="0"
            />
            
            <button
              className={`check-btn ${set.completed ? 'completed' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleSetCompleted(exerciseIndex, setIndex)
              }}
            >
              {set.completed ? '✓' : ''}
            </button>

            {exercise.sets.length > 1 && (
              <button
                className="remove-set-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveSet(exerciseIndex, setIndex)
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Inline Rest Timer */}
          {activeRestTimer && 
           activeRestTimer.exerciseIndex === exerciseIndex && 
           activeRestTimer.afterSetIndex === setIndex && (
            <div className="inline-rest-timer">
              <div 
                className="inline-rest-progress" 
                style={{ 
                  width: `${((exerciseRestDuration - activeRestTimer.timeRemaining) / exerciseRestDuration) * 100}%` 
                }}
              />
              <div className="inline-rest-content">
                <span className="inline-rest-time">
                  Rest: {formatRestTime(activeRestTimer.timeRemaining)}
                </span>
                <button 
                  className="inline-rest-skip"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSkipInlineRest()
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        className="add-set-btn"
        onClick={(e) => {
          e.stopPropagation()
          onAddSet(exerciseIndex)
        }}
      >
        + Add Set
      </button>
    </div>
  )
}

export default function WorkoutView({
  activeWorkout,
  elapsedTime,
  restTimer,
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
  onSkipRest,
  onSkipInlineRest,
  onAddExercise,
  onRemoveExercise,
  onReorderExercises,
}: WorkoutViewProps) {
  const [exerciseInput, setExerciseInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
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

  return (
    <div className="workout-view">
      <div className="workout-header">
        <button className="btn-back" onClick={onCancel}>
          ✕ Cancel
        </button>
        <h2>{activeWorkout.templateName}</h2>
        <button className="btn-finish" onClick={onFinish}>
          Finish
        </button>
      </div>

      {/* Workout Timer */}
      <div className="workout-timer">
        <div>
          <span className="timer-label">Workout Duration</span>
          <span className="timer-value">{formatElapsedTime(elapsedTime)}</span>
        </div>
        <div className="rest-settings">
          <label className="rest-label-small">Rest: </label>
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
      </div>

      {/* Rest Timer Overlay */}
      {restTimer !== null && restTimer > 0 && (
        <div className="rest-timer-overlay">
          <div className="rest-timer-content">
            <span className="rest-label">Rest Time</span>
            <span className="rest-time">{formatRestTime(restTimer)}</span>
            <button 
              className="skip-rest-btn"
              onClick={onSkipRest}
            >
              Skip Rest
            </button>
          </div>
        </div>
      )}

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
            {activeWorkout.exercises.map((exerciseLog, exerciseIndex) => {
              const pr = getPersonalRecord(exerciseLog.exerciseName)
              const exerciseRestDuration = exerciseLog.restDuration || restDuration
              
              return (
                <SortableExercise
                  key={exerciseLog.exerciseId}
                  exercise={exerciseLog}
                  exerciseIndex={exerciseIndex}
                  pr={pr}
                  exerciseRestDuration={exerciseRestDuration}
                  activeRestTimer={activeRestTimer}
                  onUpdateSet={onUpdateSet}
                  onToggleSetCompleted={onToggleSetCompleted}
                  onAddSet={onAddSet}
                  onRemoveSet={onRemoveSet}
                  onSetExerciseRestDuration={onSetExerciseRestDuration}
                  onSkipInlineRest={onSkipInlineRest}
                  onRemoveExercise={onRemoveExercise}
                  formatRestTime={formatRestTime}
                />
              )
            })}
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
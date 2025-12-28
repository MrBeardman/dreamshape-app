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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Exercise } from '../types'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface CreateTemplateViewProps {
  exerciseDatabase: ExerciseDbEntry[]
  templateToEdit: { id: string; name: string; exercises: Exercise[] } | null
  onSave: (name: string, exercises: Exercise[]) => void
  onCancel: () => void
  onAddToDatabase: (exercise: ExerciseDbEntry) => void
}

function SortableExerciseItem({
  exercise,
  index,
  onRemove,
}: {
  exercise: Exercise
  index: number
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id })

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
      className={`exercise-item ${isDragging ? 'dragging' : ''}`}
    >
      <span className="exercise-number">{index + 1}</span>
      <span className="exercise-name">{exercise.name}</span>
      <button 
        onClick={(e) => {
          e.stopPropagation()
          onRemove(exercise.id)
        }}
        className="btn-remove"
      >
        ×
      </button>
    </div>
  )
}

export default function CreateTemplateView({
  exerciseDatabase,
  templateToEdit,
  onSave,
  onCancel,
  onAddToDatabase
}: CreateTemplateViewProps) {
  const [templateName, setTemplateName] = useState(templateToEdit?.name || '')
  const [exercises, setExercises] = useState<Exercise[]>(templateToEdit?.exercises || [])
  const [exerciseInput, setExerciseInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

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
      setExercises((items) => {
        const oldIndex = items.findIndex(ex => ex.id === active.id)
        const newIndex = items.findIndex(ex => ex.id === over.id)
        
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const getGroupedSuggestions = () => {
    const searchTerm = exerciseInput.toLowerCase().trim()
    
    // Filter exercises based on search term
    const filtered = searchTerm
      ? exerciseDatabase.filter(ex =>
          ex.name.toLowerCase().includes(searchTerm) ||
          ex.muscleGroup.toLowerCase().includes(searchTerm)
        )
      : exerciseDatabase

    // Group by muscle group
    const grouped: Record<string, ExerciseDbEntry[]> = {}
    filtered.forEach(ex => {
      if (!grouped[ex.muscleGroup]) {
        grouped[ex.muscleGroup] = []
      }
      grouped[ex.muscleGroup].push(ex)
    })

    return grouped
  }

  const handleExerciseInputChange = (value: string) => {
    setExerciseInput(value)
  }

  const selectExerciseFromSuggestion = (name: string, muscleGroup: string, equipment: string) => {
    const exercise: Exercise = {
      id: Date.now().toString(),
      name,
      equipment,
      muscleGroup
    }
    
    setExercises([...exercises, exercise])
    setExerciseInput('')
    setShowSuggestions(false)
  }

  const addExercise = () => {
    if (!exerciseInput.trim()) return
    
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseInput,
      equipment: 'Barbell',
      muscleGroup: 'Other'
    }
    
    // Add to database if it doesn't exist
    const existsInDb = exerciseDatabase.some(ex => 
      ex.name.toLowerCase() === exerciseInput.toLowerCase()
    )
    
    if (!existsInDb) {
      onAddToDatabase({
        name: exerciseInput,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment
      })
    }
    
    setExercises([...exercises, exercise])
    setExerciseInput('')
    setShowSuggestions(false)
  }

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id))
  }

  const handleSave = () => {
    if (!templateName.trim() || exercises.length === 0) return
    onSave(templateName, exercises)
  }

  return (
    <div className="create-view">
      <div className="create-header">
        <button 
          className="btn-back"
          onClick={onCancel}
        >
          ← Back
        </button>
        <h2>{templateToEdit ? 'Edit Template' : 'New Template'}</h2>
      </div>

      <div className="form-group">
        <label>Template Name</label>
        <input
          type="text"
          placeholder="e.g., Upper Body A"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="input"
        />
      </div>

      <div className="exercises-section">
        <h3>Exercises ({exercises.length})</h3>
        
        <div className="add-exercise">
          <div className="exercise-input-container">
            <input
              type="text"
              placeholder="Add exercise (e.g., Bench Press)"
              value={exerciseInput}
              onChange={(e) => handleExerciseInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addExercise()}
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
                        onClick={() => selectExerciseFromSuggestion(
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
          <button onClick={addExercise} className="btn-add">+</button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="exercise-list">
            <SortableContext
              items={exercises.map(ex => ex.id)}
              strategy={verticalListSortingStrategy}
            >
              {exercises.map((exercise, index) => (
                <SortableExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  onRemove={removeExercise}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>

        {exercises.length === 0 && (
          <div className="empty-exercises">
            <p>No exercises added yet</p>
          </div>
        )}
      </div>

      <button 
        className="btn-save"
        onClick={handleSave}
        disabled={!templateName.trim() || exercises.length === 0}
      >
        {templateToEdit ? 'Update Template' : 'Save Template'}
      </button>
    </div>
  )
}
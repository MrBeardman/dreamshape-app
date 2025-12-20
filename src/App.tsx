import { useState, useEffect } from 'react'
import './App.css'

interface Exercise {
  id: string
  name: string
  equipment: string
  muscleGroup: string
}

interface WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
}

const STORAGE_KEY = 'dreamshape_templates'

function App() {
  // Load templates from localStorage on first render
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load templates:', e)
        return []
      }
    }
    return []
  })
  
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [currentExercises, setCurrentExercises] = useState<Exercise[]>([])

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  const addExercise = () => {
    if (!newExerciseName.trim()) return
    
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: newExerciseName,
      equipment: 'Barbell', // Default for now
      muscleGroup: 'Chest' // Default for now
    }
    
    setCurrentExercises([...currentExercises, exercise])
    setNewExerciseName('')
  }

  const removeExercise = (id: string) => {
    setCurrentExercises(currentExercises.filter(ex => ex.id !== id))
  }

  const saveTemplate = () => {
    if (!newTemplateName.trim() || currentExercises.length === 0) return

    const template: WorkoutTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      exercises: currentExercises
    }

    setTemplates([...templates, template])
    setNewTemplateName('')
    setCurrentExercises([])
    setIsCreating(false)
  }

  const deleteTemplate = (id: string) => {
    if (confirm('Delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">💪 DreamShape</h1>
      </header>

      {!isCreating ? (
        <div className="main-view">
          <div className="quick-start">
            <h2>My Templates ({templates.length})</h2>
            <button 
              className="btn-primary"
              onClick={() => setIsCreating(true)}
            >
              + Create Template
            </button>
          </div>

          <div className="templates-list">
            {templates.map(template => (
              <div key={template.id} className="template-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3>{template.name}</h3>
                    <p className="exercise-count">
                      {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => deleteTemplate(template.id)}
                    className="btn-remove"
                    style={{ marginTop: '0.25rem' }}
                  >
                    ×
                  </button>
                </div>
                <div className="exercise-preview">
                  {template.exercises.slice(0, 3).map(ex => (
                    <span key={ex.id} className="exercise-tag">{ex.name}</span>
                  ))}
                  {template.exercises.length > 3 && (
                    <span className="exercise-tag">+{template.exercises.length - 3} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="empty-state">
              <p>No templates yet</p>
              <p className="hint">Create your first workout template to get started!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="create-view">
          <div className="create-header">
            <button 
              className="btn-back"
              onClick={() => {
                setIsCreating(false)
                setCurrentExercises([])
                setNewTemplateName('')
              }}
            >
              ← Back
            </button>
            <h2>New Template</h2>
          </div>

          <div className="form-group">
            <label>Template Name</label>
            <input
              type="text"
              placeholder="e.g., Upper Body A"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="input"
            />
          </div>

          <div className="exercises-section">
            <h3>Exercises ({currentExercises.length})</h3>
            
            <div className="add-exercise">
              <input
                type="text"
                placeholder="Add exercise (e.g., Bench Press)"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExercise()}
                className="input"
              />
              <button onClick={addExercise} className="btn-add">+</button>
            </div>

            <div className="exercise-list">
              {currentExercises.map((exercise, index) => (
                <div key={exercise.id} className="exercise-item">
                  <span className="exercise-number">{index + 1}</span>
                  <span className="exercise-name">{exercise.name}</span>
                  <button 
                    onClick={() => removeExercise(exercise.id)}
                    className="btn-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {currentExercises.length === 0 && (
              <div className="empty-exercises">
                <p>No exercises added yet</p>
              </div>
            )}
          </div>

          <button 
            className="btn-save"
            onClick={saveTemplate}
            disabled={!newTemplateName.trim() || currentExercises.length === 0}
          >
            Save Template
          </button>
        </div>
      )}
    </div>
  )
}

export default App

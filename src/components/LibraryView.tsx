import { useState } from 'react'
import type { WorkoutTemplate } from '../types'

interface LibraryViewProps {
  templates: WorkoutTemplate[]
  exerciseDatabase: Array<{name: string, muscleGroup: string, equipment: string}>
  onCreateTemplate: () => void
  onEditTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (id: string) => void
  onStartWorkout: (template: WorkoutTemplate) => void
  onAddExercise: (exercise: { name: string, muscleGroup: string, equipment: string }) => void
  onDeleteExercise: (exerciseName: string) => void
}

export default function LibraryView({
  templates,
  exerciseDatabase,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onStartWorkout,
  // onAddExercise,      // Not used yet
  // onDeleteExercise,   // Not used yet
}: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'exercises'>('templates')

  return (
    <div className="library-view">
      <div className="library-header">
        <h1>📚 Library</h1>
      </div>

      <div className="library-tabs">
        <button
          className={`library-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <span className="tab-icon">💪</span>
          <span>Templates ({templates.length})</span>
        </button>
        <button
          className={`library-tab ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
        >
          <span className="tab-icon">🏋️</span>
          <span>Exercises ({exerciseDatabase.length})</span>
        </button>
      </div>

      <div className="library-content">
        {activeTab === 'templates' ? (
          <div className="templates-list">
            <button className="btn-create-new" onClick={onCreateTemplate}>
              + Create New Template
            </button>

            {templates.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">💪</p>
                <p className="empty-title">No templates yet</p>
                <p className="empty-text">Create your first workout template to get started!</p>
              </div>
            ) : (
              <div className="template-grid">
                {templates.map(template => (
                  <div key={template.id} className="template-card-library">
                    <div className="template-card-header">
                      <h3 className="template-card-title">{template.name}</h3>
                      <div className="template-card-actions">
                        <button
                          className="btn-icon"
                          onClick={() => onEditTemplate(template)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => onDeleteTemplate(template.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="template-card-exercises">
                      {template.exercises.slice(0, 3).map((ex, idx) => (
                        <div key={idx} className="exercise-preview">
                          • {ex.name}
                        </div>
                      ))}
                      {template.exercises.length > 3 && (
                        <div className="exercise-preview more">
                          +{template.exercises.length - 3} more
                        </div>
                      )}
                    </div>

                    <button
                      className="btn-start-workout"
                      onClick={() => onStartWorkout(template)}
                    >
                      Start Workout
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="exercises-list">
            <div className="exercise-count">
              {exerciseDatabase.length} exercises in database
            </div>

            <div className="exercise-grid">
              {Object.entries(
                exerciseDatabase.reduce((acc, ex) => {
                  if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = []
                  acc[ex.muscleGroup].push(ex)
                  return acc
                }, {} as Record<string, typeof exerciseDatabase>)
              ).map(([group, exercises]) => (
                <div key={group} className="exercise-group">
                  <h3 className="exercise-group-title">{group}</h3>
                  {exercises.map((ex, idx) => (
                    <div key={idx} className="exercise-item">
                      <div className="exercise-item-info">
                        <div className="exercise-item-name">{ex.name}</div>
                        <div className="exercise-item-equipment">{ex.equipment}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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
}: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'exercises'>('templates')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter exercises by search
  const filteredExercises = exerciseDatabase.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group exercises by muscle group
  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = []
    acc[ex.muscleGroup].push(ex)
    return acc
  }, {} as Record<string, typeof exerciseDatabase>)

  return (
    <div className="library-view">
      {/* Header */}
      <div className="library-header">
        <h2 className="view-title">Library</h2>
        {activeTab === 'templates' && (
          <button className="btn-header" onClick={onCreateTemplate}>
            New
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="library-tabs">
        <button
          className={`library-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
          <span className="tab-badge">{templates.length}</span>
        </button>
        <button
          className={`library-tab ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
          <span className="tab-badge">{exerciseDatabase.length}</span>
        </button>
      </div>

      {/* Content */}
      <div className="library-content">
        {activeTab === 'templates' ? (
          /* TEMPLATES TAB */
          templates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">No Templates Yet</h3>
              <p className="empty-text">Create workout templates to quickly start your favorite routines</p>
              <button className="btn-action-primary" onClick={onCreateTemplate}>
                Create Template
              </button>
            </div>
          ) : (
            <div className="templates-grid">
              {templates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-card-header">
                    <h3 className="template-name">{template.name}</h3>
                    <div className="template-actions">
                      <button
                        className="btn-icon-action"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditTemplate(template)
                        }}
                        title="Edit"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon-action btn-icon-danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteTemplate(template.id)
                        }}
                        title="Delete"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="template-info">
                    <div className="template-stat">
                      <span className="template-stat-value">{template.exercises.length}</span>
                      <span className="template-stat-label">Exercises</span>
                    </div>
                  </div>

                  <div className="template-exercises-preview">
                    {template.exercises.slice(0, 4).map((ex, idx) => (
                      <div key={idx} className="exercise-chip">
                        {ex.name}
                      </div>
                    ))}
                    {template.exercises.length > 4 && (
                      <div className="exercise-chip-more">
                        +{template.exercises.length - 4}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn-start-template"
                    onClick={() => onStartWorkout(template)}
                  >
                    Start Workout
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* EXERCISES TAB */
          <div className="exercises-section">
            {/* Search */}
            <div className="search-box">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Exercise count */}
            <div className="exercises-count">
              {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'}
            </div>

            {/* Grouped exercises */}
            <div className="exercises-groups">
              {Object.entries(groupedExercises)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([group, exercises]) => (
                  <div key={group} className="exercise-group">
                    <div className="exercise-group-header">
                      <h3 className="exercise-group-title">{group}</h3>
                      <span className="exercise-group-count">{exercises.length}</span>
                    </div>
                    
                    <div className="exercise-list">
                      {exercises.map((ex, idx) => (
                        <div key={idx} className="exercise-item">
                          <div className="exercise-item-main">
                            <div className="exercise-item-name">{ex.name}</div>
                            <div className="exercise-item-equipment">{ex.equipment}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {filteredExercises.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3 className="empty-title">No Results</h3>
                <p className="empty-text">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

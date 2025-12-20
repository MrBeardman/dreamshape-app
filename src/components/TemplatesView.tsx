import type { WorkoutTemplate } from '../types'

interface TemplatesViewProps {
  templates: WorkoutTemplate[]
  onCreateTemplate: () => void
  onDeleteTemplate: (id: string) => void
  onStartWorkout: (template: WorkoutTemplate) => void
}

export default function TemplatesView({
  templates,
  onCreateTemplate,
  onDeleteTemplate,
  onStartWorkout
}: TemplatesViewProps) {
  return (
    <div className="main-view">
      <div className="quick-start">
        <h2>My Templates ({templates.length})</h2>
        <button 
          className="btn-primary"
          onClick={onCreateTemplate}
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
                onClick={() => onDeleteTemplate(template.id)}
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
            <button
              className="btn-start-workout"
              onClick={() => onStartWorkout(template)}
            >
              Start Workout
            </button>
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
  )
}

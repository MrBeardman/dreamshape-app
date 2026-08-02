import type { WorkoutTemplate, WorkoutLog } from '../types'

interface TemplatesViewProps {
  templates: WorkoutTemplate[]
  workoutLogs: WorkoutLog[]
  onCreateTemplate: () => void
  onEditTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (id: string) => void
  onStartWorkout: (template: WorkoutTemplate) => void
}

export default function TemplatesView({
  templates,
  workoutLogs,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onStartWorkout,
}: TemplatesViewProps) {
  const getAvgDuration = (templateName: string): number | null => {
    const logs = workoutLogs.filter(w => w.templateName === templateName && w.duration > 60)
    if (logs.length === 0) return null
    return Math.round(logs.reduce((sum, w) => sum + w.duration, 0) / logs.length / 60)
  }

  return (
    <div className="main-view">
      <div className="quick-start">
        <h2>My Templates ({templates.length})</h2>
        <button className="btn-primary" onClick={onCreateTemplate}>
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
                  {getAvgDuration(template.name) !== null && (
                    <span className="template-avg-duration"> · ~{getAvgDuration(template.name)} min</span>
                  )}
                </p>
              </div>
              <button onClick={() => onDeleteTemplate(template.id)} className="btn-remove" style={{ marginTop: '0.25rem' }}>
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
            <div className="template-actions">
              <button className="btn-edit" onClick={() => onEditTemplate(template)}>Edit</button>
              <button className="btn-start-workout" onClick={() => onStartWorkout(template)}>Start Workout</button>
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
  )
}

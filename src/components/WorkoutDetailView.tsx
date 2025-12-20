import type { WorkoutLog } from '../types'

interface WorkoutDetailViewProps {
  workout: WorkoutLog
  onBack: () => void
  onDelete: (id: string) => void
}

export default function WorkoutDetailView({ workout, onBack, onDelete }: WorkoutDetailViewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()
    
    if (isToday) return 'Today'
    if (isYesterday) return 'Yesterday'
    
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  return (
    <div className="workout-detail-view">
      <div className="workout-detail-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h2>{workout.templateName}</h2>
        <button 
          className="btn-remove"
          onClick={() => onDelete(workout.id)}
        >
          ×
        </button>
      </div>

      <div className="workout-meta">
        <div className="meta-item">
          <span className="meta-label">Date</span>
          <span className="meta-value">{formatDate(workout.date)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Time</span>
          <span className="meta-value">{formatTime(workout.date)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Duration</span>
          <span className="meta-value">{formatDuration(workout.duration)}</span>
        </div>
      </div>

      <div className="workout-exercises">
        {workout.exercises.map((exerciseLog) => (
          <div key={exerciseLog.exerciseId} className="workout-exercise">
            <h3 className="exercise-title">{exerciseLog.exerciseName}</h3>
            
            <div className="sets-header">
              <span className="set-col">Set</span>
              <span className="kg-col">kg</span>
              <span className="reps-col">Reps</span>
              <span className="check-col">✓</span>
            </div>

            {exerciseLog.sets.map((set, setIndex) => (
              <div key={set.id} className="set-row-readonly">
                <span className="set-number">{setIndex + 1}</span>
                <span className="set-value">{set.weight} kg</span>
                <span className="set-value">{set.reps} reps</span>
                <span className="set-check">{set.completed ? '✓' : '-'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

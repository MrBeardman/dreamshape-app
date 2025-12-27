import type { WorkoutLog } from '../types'

interface WorkoutsViewProps {
  workoutLogs: WorkoutLog[]
  onStartWorkout: () => void
  onSelectWorkout: (workout: WorkoutLog) => void
}

export default function WorkoutsView({ workoutLogs, onStartWorkout, onSelectWorkout }: WorkoutsViewProps) {
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
    <div className="main-view">
      <div className="quick-start">
        <h2>My Workouts</h2>
        <button 
          className="btn-primary"
          onClick={onStartWorkout}
        >
          Start Workout
        </button>
      </div>

      <h3 style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Past Workouts
      </h3>
      
      {workoutLogs.length === 0 ? (
        <div className="empty-state">
          <p>No workouts logged yet</p>
          <p className="hint">Start your first workout to begin tracking your progress!</p>
        </div>
      ) : (
        <div className="history-list">
          {workoutLogs.map((workout) => (
            <div 
              key={workout.id} 
              className="history-card"
              onClick={() => onSelectWorkout(workout)}
            >
              <div className="history-header">
                <h3>{workout.templateName}</h3>
                <span className="history-date">{formatDate(workout.date)}</span>
              </div>
              <div className="history-details">
                <span className="history-detail">
                  🏋️ {workout.exercises.length} exercises
                </span>
                <span className="history-detail">
                  ⏱️ {formatDuration(workout.duration)}
                </span>
                <span className="history-detail">
                  🕐 {formatTime(workout.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

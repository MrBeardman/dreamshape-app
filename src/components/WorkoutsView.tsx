import { useState, useRef } from 'react'
import type { WorkoutLog } from '../types'

interface WorkoutsViewProps {
  workoutLogs: WorkoutLog[]
  onStartWorkout: () => void
  onSelectWorkout: (workout: WorkoutLog) => void
  onDeleteWorkout: (id: string) => void
}

const DELETE_REVEAL = 80 // px to swipe left to reveal delete button

function SwipeableCard({
  workout,
  onSelect,
  onDelete,
  formatTime,
  formatDuration,
  getTotalVolume,
  getTotalSets,
}: {
  workout: WorkoutLog
  onSelect: () => void
  onDelete: () => void
  formatTime: (d: string) => string
  formatDuration: (s: number) => string
  getTotalVolume: (w: WorkoutLog) => string
  getTotalSets: (w: WorkoutLog) => number
}) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const startOffsetRef = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    startOffsetRef.current = offsetX
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current
    const newOffset = startOffsetRef.current + dx
    // Only allow swipe left (negative), cap at DELETE_REVEAL + a little bounce
    setOffsetX(Math.min(0, Math.max(newOffset, -(DELETE_REVEAL + 16))))
  }

  const handleTouchEnd = () => {
    setDragging(false)
    // Snap open or closed
    if (offsetX < -(DELETE_REVEAL / 2)) {
      setOffsetX(-DELETE_REVEAL)
    } else {
      setOffsetX(0)
    }
  }

  const handleCardClick = () => {
    if (offsetX !== 0) {
      setOffsetX(0)
    } else {
      onSelect()
    }
  }

  return (
    <div className="swipeable-card-wrap">
      {/* Red delete layer behind the card */}
      <div className="swipe-delete-layer">
        <button
          className="swipe-delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          Delete
        </button>
      </div>

      {/* The card itself — slides left */}
      <div
        className="workout-card"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease',
        }}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Timeline dot */}
        <div className="timeline-dot" />

        <div className="workout-card-content">
          <div className="workout-card-header">
            <h3 className="workout-name">{workout.templateName}</h3>
            <span className="workout-time">{formatTime(workout.date)}</span>
          </div>

          <div className="workout-stats-grid">
            <div className="workout-stat">
              <div className="workout-stat-value">{workout.exercises.length}</div>
              <div className="workout-stat-label">Exercises</div>
            </div>
            <div className="workout-stat">
              <div className="workout-stat-value">{getTotalSets(workout)}</div>
              <div className="workout-stat-label">Sets</div>
            </div>
            <div className="workout-stat">
              <div className="workout-stat-value">{getTotalVolume(workout)}t</div>
              <div className="workout-stat-label">Volume</div>
            </div>
            <div className="workout-stat">
              <div className="workout-stat-value">{formatDuration(workout.duration)}</div>
              <div className="workout-stat-label">Duration</div>
            </div>
          </div>

          <div className="workout-exercises">
            {workout.exercises.slice(0, 3).map((exercise, idx) => (
              <span key={idx} className="exercise-tag">{exercise.exerciseName}</span>
            ))}
            {workout.exercises.length > 3 && (
              <span className="exercise-tag-more">+{workout.exercises.length - 3} more</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutsView({ workoutLogs, onStartWorkout, onSelectWorkout, onDeleteWorkout }: WorkoutsViewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()
    if (isToday) return 'Today'
    if (isYesterday) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  const getTotalVolume = (workout: WorkoutLog) => {
    const volume = workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exTotal, set) => exTotal + (set.weight * set.reps), 0)
    }, 0)
    return (volume / 1000).toFixed(1)
  }

  const getTotalSets = (workout: WorkoutLog) => {
    return workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.filter(s => s.completed).length
    }, 0)
  }

  const groupedWorkouts = workoutLogs.reduce((groups, workout) => {
    const dateKey = new Date(workout.date).toDateString()
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(workout)
    return groups
  }, {} as Record<string, WorkoutLog[]>)

  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="workouts-view">
      <div className="workouts-header">
        <h2 className="view-title">History</h2>
        <button className="btn-header" onClick={onStartWorkout}>New</button>
      </div>

      {workoutLogs.length > 0 && (
        <div className="workouts-summary">
          <div className="summary-stat">
            <div className="summary-value">{workoutLogs.length}</div>
            <div className="summary-label">Total</div>
          </div>
          <div className="summary-stat">
            <div className="summary-value">
              {workoutLogs.filter(w => {
                const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
                return new Date(w.date) >= weekAgo
              }).length}
            </div>
            <div className="summary-label">This Week</div>
          </div>
          <div className="summary-stat">
            <div className="summary-value">
              {Math.round(workoutLogs.reduce((sum, w) => sum + w.duration, 0) / 3600)}h
            </div>
            <div className="summary-label">Time</div>
          </div>
        </div>
      )}

      {workoutLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3 className="empty-title">No Workouts Yet</h3>
          <p className="empty-text">Start your first workout to begin tracking your progress</p>
          <button className="btn-action-primary" onClick={onStartWorkout}>Start First Workout</button>
        </div>
      ) : (
        <div className="timeline">
          {sortedDates.map((dateKey) => (
            <div key={dateKey} className="timeline-section">
              <div className="timeline-date">
                {formatDate(groupedWorkouts[dateKey][0].date)}
              </div>
              {groupedWorkouts[dateKey].map((workout) => (
                <SwipeableCard
                  key={workout.id}
                  workout={workout}
                  onSelect={() => onSelectWorkout(workout)}
                  onDelete={() => onDeleteWorkout(workout.id)}
                  formatTime={formatTime}
                  formatDuration={formatDuration}
                  getTotalVolume={getTotalVolume}
                  getTotalSets={getTotalSets}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

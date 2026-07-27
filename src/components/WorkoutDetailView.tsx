import { useState } from 'react'
import type { WorkoutLog } from '../types'

interface WorkoutDetailViewProps {
  workout: WorkoutLog
  onBack: () => void
  onDelete: (id: string) => void
  onUpdateDuration: (id: string, newDurationSeconds: number) => void
}

export default function WorkoutDetailView({ workout, onBack, onDelete, onUpdateDuration }: WorkoutDetailViewProps) {
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationHours, setDurationHours] = useState(String(Math.floor(workout.duration / 3600)))
  const [durationMins, setDurationMins] = useState(String(Math.floor((workout.duration % 3600) / 60)))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  const handleSaveDuration = () => {
    const h = Math.max(0, Number(durationHours) || 0)
    const m = Math.max(0, Math.min(59, Number(durationMins) || 0))
    const newSeconds = h * 3600 + m * 60
    if (newSeconds > 0) onUpdateDuration(workout.id, newSeconds)
    setEditingDuration(false)
  }

  const handleCancelDuration = () => {
    setDurationHours(String(Math.floor(workout.duration / 3600)))
    setDurationMins(String(Math.floor((workout.duration % 3600) / 60)))
    setEditingDuration(false)
  }

  return (
    <div className="workout-detail-view">
      <div className="workout-detail-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>{workout.templateName}</h2>
        <button className="btn-remove" onClick={() => onDelete(workout.id)}>×</button>
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
          {editingDuration ? (
            <div className="duration-edit-inline">
              <input
                type="number"
                className="input duration-input"
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
                min="0"
                placeholder="h"
              />
              <span className="duration-sep">h</span>
              <input
                type="number"
                className="input duration-input"
                value={durationMins}
                onChange={e => setDurationMins(e.target.value)}
                min="0"
                max="59"
                placeholder="m"
              />
              <span className="duration-sep">m</span>
              <button className="btn btn-primary btn-xs" onClick={handleSaveDuration}>✓</button>
              <button className="btn btn-secondary btn-xs" onClick={handleCancelDuration}>✕</button>
            </div>
          ) : (
            <span
              className="meta-value meta-value-editable"
              onClick={() => setEditingDuration(true)}
              title="Click to edit duration"
            >
              {formatDuration(workout.duration)} ✎
            </span>
          )}
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

            {exerciseLog.sets.map((set, setIndex) => {
              const setType = set.type || 'working'
              const workingNumber = exerciseLog.sets
                .slice(0, setIndex + 1)
                .filter(s => (s.type || 'working') === 'working').length
              return (
                <div key={set.id} className={`set-row-readonly ${setType === 'warmup' ? 'warmup' : ''}`}>
                  <span className={`set-number ${setType === 'warmup' ? 'warmup-badge' : ''}`}>
                    {setType === 'warmup' ? 'W' : workingNumber}
                  </span>
                  <span className="set-value">{set.weight} kg</span>
                  <span className="set-value">{set.reps} reps</span>
                  <span className="set-check">{set.completed ? '✓' : '–'}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

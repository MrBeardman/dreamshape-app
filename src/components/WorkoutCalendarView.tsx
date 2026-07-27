import { useMemo, useState } from 'react'
import type { WorkoutLog } from '../types'

interface WorkoutCalendarViewProps {
  workoutLogs: WorkoutLog[]
  onOpenWorkout?: (workout: WorkoutLog) => void
  onDeleteWorkout?: (id: string) => void
}

type Cell = { date: string; dayNum: number; workout: WorkoutLog | null; isToday: boolean } | null

export default function WorkoutCalendarView({ workoutLogs, onOpenWorkout, onDeleteWorkout }: WorkoutCalendarViewProps) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthAnchor = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    d.setHours(0, 0, 0, 0)
    return d
  }, [monthOffset])

  const monthCalendarData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()
    const year = monthAnchor.getFullYear()
    const month = monthAnchor.getMonth()
    const firstDay = new Date(year, month, 1)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Cell[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      const workout = workoutLogs.find(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === date.getTime()
      }) ?? null
      cells.push({ date: dateStr, dayNum: d, workout, isToday: date.getTime() === todayTime })
    }
    return cells
  }, [workoutLogs, monthAnchor])

  const selectedWorkout = useMemo(() => {
    if (!selectedDate) return null
    return workoutLogs.find(log => {
      const logDate = new Date(log.date)
      logDate.setHours(0, 0, 0, 0)
      return logDate.toISOString().split('T')[0] === selectedDate
    }) ?? null
  }, [selectedDate, workoutLogs])

  const changeMonth = (delta: number) => {
    setMonthOffset(prev => prev + delta)
    setSelectedDate(null)
  }

  return (
    <div className="workout-calendar">
      <div className="calendar-month-nav">
        <button className="calendar-month-nav-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
        <span className="calendar-month-label">
          {monthAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          className="calendar-month-nav-btn"
          onClick={() => changeMonth(1)}
          disabled={monthOffset >= 0}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="month-cal-header">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="month-cal-grid">
        {monthCalendarData.map((cell, i) =>
          cell ? (
            <div
              key={cell.date}
              className={['month-cal-cell', cell.workout ? 'active' : '', cell.isToday ? 'today' : '', selectedDate === cell.date ? 'selected' : ''].filter(Boolean).join(' ')}
              onClick={() => { if (cell.workout) setSelectedDate(selectedDate === cell.date ? null : cell.date) }}
            >
              {cell.dayNum}
            </div>
          ) : (
            <div key={`pad-${i}`} className="month-cal-cell empty" />
          )
        )}
      </div>

      {selectedWorkout && (() => {
        const w = selectedWorkout
        const vol = w.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0)
        const dur = Math.floor(w.duration / 60)
        return (
          <div className="calendar-day-detail">
            <div className="day-detail-header">
              <span className="day-detail-date">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <button className="day-detail-close" onClick={() => setSelectedDate(null)}>×</button>
            </div>
            <div className="day-detail-name">{w.templateName}</div>
            <div className="day-detail-meta">
              <span>{dur} min</span>
              <span>{(vol / 1000).toFixed(1)}t volume</span>
              <span>{w.exercises.length} exercises</span>
            </div>
            <div className="day-detail-exercises">
              {w.exercises.slice(0, 5).map(ex => (
                <span key={ex.exerciseId} className="day-detail-exercise-tag">{ex.exerciseName}</span>
              ))}
              {w.exercises.length > 5 && <span className="day-detail-exercise-tag muted">+{w.exercises.length - 5} more</span>}
            </div>
            {(onOpenWorkout || onDeleteWorkout) && (
              <div className="day-detail-actions">
                {onOpenWorkout && (
                  <button className="day-detail-action-btn" onClick={() => onOpenWorkout(w)}>Open →</button>
                )}
                {onDeleteWorkout && (
                  <button className="day-detail-action-btn danger" onClick={() => { onDeleteWorkout(w.id); setSelectedDate(null) }}>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

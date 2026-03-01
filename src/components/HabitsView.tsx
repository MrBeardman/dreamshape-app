import { useState, useRef, useMemo } from 'react'
import type { Habit, HabitCompletion, DailyTask } from '../types'

interface HabitsViewProps {
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  dailyTasks: DailyTask[]
  onAddHabit: (name: string) => void
  onDeleteHabit: (id: string) => void
  onToggleHabitCompletion: (habitId: string, date: string) => void
  onAddTask: (text: string, date: string) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
}

export default function HabitsView({
  habits,
  habitCompletions,
  dailyTasks,
  onAddHabit,
  onDeleteHabit,
  onToggleHabitCompletion,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: HabitsViewProps) {
  const [activeTab, setActiveTab] = useState<'habits' | 'tasks'>('habits')
  const [habitInput, setHabitInput] = useState('')
  const [taskInput, setTaskInput] = useState('')
  const habitInputRef = useRef<HTMLInputElement>(null)
  const taskInputRef = useRef<HTMLInputElement>(null)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Today's completions
  const todayCompletedIds = new Set(
    habitCompletions.filter(c => c.date === todayStr).map(c => c.habitId)
  )
  const completedCount = habits.filter(h => todayCompletedIds.has(h.id)).length
  const totalHabits = habits.length

  // Heatmap: last 84 days (12 weeks)
  const heatmapData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()
    return Array.from({ length: 84 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (83 - i))
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      const completedIds = new Set(habitCompletions.filter(c => c.date === dateStr).map(c => c.habitId))
      const completed = habits.filter(h => completedIds.has(h.id)).length
      const total = habits.length
      const ratio = total > 0 ? completed / total : 0
      return { date: dateStr, completed, total, ratio, isToday: date.getTime() === todayTime }
    })
  }, [habits, habitCompletions])

  function hmLevel(ratio: number, total: number): 0 | 1 | 2 | 3 | 4 {
    if (total === 0 || ratio === 0) return 0
    if (ratio < 0.5) return 1
    if (ratio < 0.75) return 2
    if (ratio < 1) return 3
    return 4
  }

  // Ring math (r=40, same as nutrition ring pattern)
  const r = 40
  const circumference = 2 * Math.PI * r
  const pct = totalHabits > 0 ? completedCount / totalHabits : 0
  const dashOffset = circumference * (1 - pct)

  // Today's tasks
  const todayTasks = dailyTasks.filter(t => t.date === todayStr)
  const activeTasks = todayTasks.filter(t => !t.completed)
  const completedTasks = todayTasks.filter(t => t.completed)

  const handleAddHabit = () => {
    const name = habitInput.trim()
    if (!name) return
    onAddHabit(name)
    setHabitInput('')
    habitInputRef.current?.focus()
  }

  const handleAddTask = () => {
    const text = taskInput.trim()
    if (!text) return
    onAddTask(text, todayStr)
    setTaskInput('')
    taskInputRef.current?.focus()
  }

  return (
    <div className="habits-view">
      <div className="habits-view-header">
        <h2 className="habits-view-title">Habits &amp; Tasks</h2>
      </div>

      {/* Sub-tabs */}
      <div className="habits-tabs">
        <button
          className={`habit-tab ${activeTab === 'habits' ? 'active' : ''}`}
          onClick={() => setActiveTab('habits')}
        >
          Habits
        </button>
        <button
          className={`habit-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
      </div>

      {activeTab === 'habits' && (
        <>
          {/* Date + progress */}
          <div className="habits-date-header">
            <span className="habits-date-label">{todayLabel}</span>
            {totalHabits > 0 && (
              <span className="habits-progress-counter">{completedCount} / {totalHabits}</span>
            )}
          </div>

          {/* Completion ring */}
          {totalHabits > 0 && (
            <div className="completion-ring-section">
              <svg
                className="completion-ring-svg"
                width="100"
                height="100"
                viewBox="0 0 100 100"
              >
                <circle
                  className="completion-ring-bg"
                  cx="50"
                  cy="50"
                  r={r}
                  strokeWidth="8"
                />
                <circle
                  className="completion-ring-fill"
                  cx="50"
                  cy="50"
                  r={r}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--text-primary)"
                  fontSize="20"
                  fontWeight="700"
                  transform="rotate(90 50 50)"
                >
                  {Math.round(pct * 100)}%
                </text>
              </svg>
              <span className="completion-ring-label">
                {completedCount === totalHabits && totalHabits > 0
                  ? 'All done!'
                  : `${completedCount} of ${totalHabits} completed`}
              </span>
            </div>
          )}

          {/* Habit list */}
          {habits.length === 0 ? (
            <p className="habits-empty">No habits yet — add your first one below</p>
          ) : (
            <div className="habit-list">
              {habits.map(habit => {
                const done = todayCompletedIds.has(habit.id)
                return (
                  <div key={habit.id} className="habit-item">
                    <button
                      className={`habit-checkbox ${done ? 'checked' : ''}`}
                      onClick={() => onToggleHabitCompletion(habit.id, todayStr)}
                      aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                    />
                    <span className={`habit-name ${done ? 'done' : ''}`}>{habit.name}</span>
                    <button
                      className="habit-delete-btn"
                      onClick={() => onDeleteHabit(habit.id)}
                      aria-label="Delete habit"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add habit */}
          <div className="habit-add-row">
            <input
              ref={habitInputRef}
              className="habit-add-input"
              type="text"
              placeholder="Add a new habit..."
              value={habitInput}
              onChange={e => setHabitInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddHabit() }}
            />
            <button className="habit-add-btn" onClick={handleAddHabit} aria-label="Add habit">+</button>
          </div>

          {/* History heatmap */}
          {habits.length > 0 && (
            <div className="habit-heatmap-section">
              <div className="habit-heatmap-header">
                <span className="habit-heatmap-title">History</span>
                <span className="habit-heatmap-subtitle">Last 12 weeks</span>
              </div>

              <div className="calendar-wrapper">
                <div className="calendar-y-axis">
                  {['Mon', 'Wed', 'Fri', 'Sun'].map(d => (
                    <div key={d} className="calendar-y-label">{d}</div>
                  ))}
                </div>
                <div className="calendar-main">
                  <div className="habit-hm-grid">
                    {heatmapData.map(day => {
                      const level = hmLevel(day.ratio, day.total)
                      return (
                        <div
                          key={day.date}
                          className={[
                            'habit-hm-cell',
                            `habit-hm-${level}`,
                            day.isToday ? 'habit-hm-today' : '',
                            selectedDate === day.date ? 'habit-hm-selected' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
                          title={`${day.date}: ${day.completed}/${day.total}`}
                        />
                      )
                    })}
                  </div>
                  <div className="calendar-x-axis">
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date()
                      date.setDate(date.getDate() - (11 - i) * 7)
                      return (
                        <div key={i} className="calendar-x-label">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="habit-hm-legend">
                <span>Less</span>
                <div className="habit-hm-cell habit-hm-0" />
                <div className="habit-hm-cell habit-hm-1" />
                <div className="habit-hm-cell habit-hm-2" />
                <div className="habit-hm-cell habit-hm-3" />
                <div className="habit-hm-cell habit-hm-4" />
                <span>More</span>
              </div>

              {/* Day detail */}
              {selectedDate && (() => {
                const day = heatmapData.find(d => d.date === selectedDate)
                if (!day) return null
                const completedIds = new Set(
                  habitCompletions.filter(c => c.date === selectedDate).map(c => c.habitId)
                )
                return (
                  <div className="calendar-day-detail">
                    <div className="day-detail-header">
                      <span className="day-detail-date">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </span>
                      <button className="day-detail-close" onClick={() => setSelectedDate(null)}>×</button>
                    </div>
                    <div className="day-detail-name">
                      {day.completed === 0
                        ? 'None completed'
                        : day.completed === day.total
                          ? 'All habits completed!'
                          : `${day.completed} of ${day.total} completed`}
                    </div>
                    <div className="day-detail-exercises">
                      {habits.map(h => (
                        <span
                          key={h.id}
                          className={`day-detail-exercise-tag${completedIds.has(h.id) ? '' : ' muted'}`}
                        >
                          {completedIds.has(h.id) ? '✓' : '✗'} {h.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </>
      )}

      {activeTab === 'tasks' && (
        <>
          {/* Date header */}
          <div className="habits-date-header">
            <span className="habits-date-label">{todayLabel}</span>
            {todayTasks.length > 0 && (
              <span className="habits-progress-counter">
                {completedTasks.length} / {todayTasks.length} done
              </span>
            )}
          </div>

          {/* Add task */}
          <div className="task-add-row">
            <input
              ref={taskInputRef}
              className="task-add-input"
              type="text"
              placeholder="Add a task for today..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }}
            />
            <button className="task-add-btn" onClick={handleAddTask} aria-label="Add task">+</button>
          </div>

          {todayTasks.length === 0 ? (
            <p className="habits-empty">No tasks for today</p>
          ) : (
            <div className="task-list">
              {/* Active tasks */}
              {activeTasks.map(task => (
                <div key={task.id} className="task-item">
                  <button
                    className="task-checkbox"
                    onClick={() => onToggleTask(task.id)}
                    aria-label="Complete task"
                  />
                  <span className="task-text">{task.text}</span>
                  <button
                    className="task-delete-btn"
                    onClick={() => onDeleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <>
                  {activeTasks.length > 0 && (
                    <div className="task-section-label">Completed</div>
                  )}
                  {completedTasks.map(task => (
                    <div key={task.id} className="task-item">
                      <button
                        className="task-checkbox checked"
                        onClick={() => onToggleTask(task.id)}
                        aria-label="Mark incomplete"
                      />
                      <span className="task-text completed">{task.text}</span>
                      <button
                        className="task-delete-btn"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label="Delete task"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

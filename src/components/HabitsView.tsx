import { useState, useRef } from 'react'
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

  const todayStr = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Today's completions
  const todayCompletedIds = new Set(
    habitCompletions.filter(c => c.date === todayStr).map(c => c.habitId)
  )
  const completedCount = habits.filter(h => todayCompletedIds.has(h.id)).length
  const totalHabits = habits.length

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

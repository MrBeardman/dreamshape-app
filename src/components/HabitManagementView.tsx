import { useState } from 'react'
import type { Habit, HabitRecurrence, HabitRecurrenceType, WorkoutTemplate } from '../types'
import { todayISO } from '../lib/habits'

interface HabitManagementViewProps {
  habits: Habit[]
  templates: WorkoutTemplate[]
  onSaveHabit: (habit: Habit) => void
  onDeleteHabit: (habitId: string) => void
  onReorderHabits: (habits: Habit[]) => void
  onBack: () => void
}

const ICON_OPTIONS = ['🏋️', '🏃', '🧘', '🚭', '📵', '💧', '😴', '📖', '🧹', '💊', '🎯', '☀️']

const WEEKDAY_CHIPS: { label: string; value: number }[] = [
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
  { label: 'Su', value: 0 },
]

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function recurrenceSummary(r: HabitRecurrence): string {
  if (r.type === 'daily') return 'Daily'
  if (r.type === 'weekdays') {
    const days = [...(r.weekdays ?? [])].sort((a, b) => a - b)
    if (days.length === 0) return 'No days selected'
    if (days.length === 7) return 'Daily'
    return days.map(d => WEEKDAY_LABELS[d]).join(', ')
  }
  const n = r.intervalDays ?? 1
  return `Every ${n} day${n === 1 ? '' : 's'}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export default function HabitManagementView({ habits, templates, onSaveHabit, onDeleteHabit, onReorderHabits, onBack }: HabitManagementViewProps) {
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | undefined>(undefined)
  const [recurrenceType, setRecurrenceType] = useState<HabitRecurrenceType>('daily')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [intervalDays, setIntervalDays] = useState(2)
  const [anchorDate, setAnchorDate] = useState(todayISO())
  const [timeOfDay, setTimeOfDay] = useState('')
  const [linkedTemplateId, setLinkedTemplateId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const openEditor = (target: Habit | 'new') => {
    if (target === 'new') {
      setName('')
      setIcon(undefined)
      setRecurrenceType('daily')
      setWeekdays([])
      setIntervalDays(2)
      setAnchorDate(todayISO())
      setTimeOfDay('')
      setLinkedTemplateId('')
      setIsActive(true)
    } else {
      setName(target.name)
      setIcon(target.icon)
      setRecurrenceType(target.recurrence.type)
      setWeekdays(target.recurrence.weekdays ?? [])
      setIntervalDays(target.recurrence.intervalDays ?? 2)
      setAnchorDate(target.recurrence.anchorDate ?? target.createdAt.slice(0, 10))
      setTimeOfDay(target.timeOfDay ?? '')
      setLinkedTemplateId(target.linkedTemplateId ?? '')
      setIsActive(target.isActive)
    }
    setEditing(target)
  }

  const toggleWeekday = (value: number) =>
    setWeekdays(prev => prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value])

  const moveHabit = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= habits.length) return
    const reordered = [...habits]
    ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
    onReorderHabits(reordered.map((h, i) => ({ ...h, sortOrder: i })))
  }

  const canSave = name.trim().length > 0 && (recurrenceType !== 'weekdays' || weekdays.length > 0)

  const handleSave = () => {
    if (!canSave || editing === null) return
    const recurrence: HabitRecurrence =
      recurrenceType === 'daily' ? { type: 'daily' } :
      recurrenceType === 'weekdays' ? { type: 'weekdays', weekdays } :
      { type: 'interval', intervalDays: Math.max(1, intervalDays), anchorDate }

    const habit: Habit = editing === 'new'
      ? {
          id: crypto.randomUUID(),
          name: name.trim(),
          icon,
          recurrence,
          timeOfDay: timeOfDay || undefined,
          linkedTemplateId: linkedTemplateId || undefined,
          isActive: true,
          sortOrder: habits.length,
          createdAt: new Date().toISOString(),
        }
      : {
          ...editing,
          name: name.trim(),
          icon,
          recurrence,
          timeOfDay: timeOfDay || undefined,
          linkedTemplateId: linkedTemplateId || undefined,
          isActive,
        }

    onSaveHabit(habit)
    setEditing(null)
  }

  const handleDelete = () => {
    if (editing === null || editing === 'new') return
    onDeleteHabit(editing.id)
    setEditing(null)
  }

  if (editing !== null) {
    return (
      <div className="create-view">
        <div className="create-header habit-editor-header">
          <div>
            <button className="btn-back" onClick={() => setEditing(null)}>← Back</button>
            <h2>{editing === 'new' ? 'New Habit' : 'Edit Habit'}</h2>
          </div>
          {editing !== 'new' && (
            <label className="ios-toggle">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span className="ios-toggle-track"><span className="ios-toggle-thumb" /></span>
            </label>
          )}
        </div>

        <div className="form-group">
          <label>Name</label>
          <input type="text" className="input" placeholder="e.g., Morning stretch" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Icon</label>
          <div className="habit-icon-picker">
            {ICON_OPTIONS.map(opt => (
              <button
                key={opt}
                type="button"
                className={`habit-icon-option${icon === opt ? ' selected' : ''}`}
                onClick={() => setIcon(icon === opt ? undefined : opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Repeats</label>
          <div className="chart-period-toggle">
            {(['daily', 'weekdays', 'interval'] as HabitRecurrenceType[]).map(t => (
              <button
                key={t}
                className={`period-btn${recurrenceType === t ? ' active' : ''}`}
                onClick={() => setRecurrenceType(t)}
              >
                {t === 'daily' ? 'Daily' : t === 'weekdays' ? 'Weekdays' : 'Every N days'}
              </button>
            ))}
          </div>

          {recurrenceType === 'weekdays' && (
            <div className="habit-weekday-chips">
              {WEEKDAY_CHIPS.map(chip => (
                <button
                  key={chip.value}
                  type="button"
                  className={`habit-weekday-chip${weekdays.includes(chip.value) ? ' active' : ''}`}
                  onClick={() => toggleWeekday(chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {recurrenceType === 'interval' && (
            <div className="habit-interval-row">
              <span>Every</span>
              <input
                type="number"
                className="input habit-interval-input"
                min={1}
                value={intervalDays}
                onChange={e => setIntervalDays(Math.max(1, Number(e.target.value) || 1))}
              />
              <span>days, starting</span>
              <input type="date" className="input" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Time of day (optional)</label>
          <div className="habit-time-row">
            <input type="time" className="input" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} />
            {timeOfDay && (
              <button type="button" className="habit-time-clear-btn" onClick={() => setTimeOfDay('')} aria-label="Clear time">×</button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Linked workout template (optional)</label>
          <select className="rest-select" value={linkedTemplateId} onChange={e => setLinkedTemplateId(e.target.value)}>
            <option value="">None</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="plan-editor-footer">
          {editing !== 'new' && (
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--error)' }} onClick={handleDelete}>
              Delete Habit
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave} style={{ marginLeft: 'auto' }}>
            {editing === 'new' ? 'Create Habit' : 'Save Changes'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="create-view">
      <div className="create-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Manage Habits</h2>
      </div>

      <button className="plan-add-day-btn habit-add-btn" onClick={() => openEditor('new')}>+ Add Habit</button>

      <div className="habit-manage-list">
        {habits.length === 0 && <p className="habits-empty-text">No habits yet — add your first one above.</p>}
        {habits.map((habit, idx) => (
          <div key={habit.id} className={`plan-day-row${!habit.isActive ? ' habit-row-archived' : ''}`}>
            <div className="plan-day-row-left">
              <span className="plan-day-icon">{habit.icon || '•'}</span>
              <div>
                <div className="habit-manage-name">
                  {habit.name}
                  {!habit.isActive && <span className="habit-archived-tag">Archived</span>}
                </div>
                <div className="habit-manage-sub">
                  {recurrenceSummary(habit.recurrence)}
                  {habit.timeOfDay && ` · ${formatTime(habit.timeOfDay)}`}
                </div>
              </div>
            </div>
            <div className="plan-day-row-actions">
              <button className="plan-day-move" onClick={() => moveHabit(idx, -1)} disabled={idx === 0}>↑</button>
              <button className="plan-day-move" onClick={() => moveHabit(idx, 1)} disabled={idx === habits.length - 1}>↓</button>
              <button className="plan-day-move habit-edit-icon-btn" onClick={() => openEditor(habit)} aria-label="Edit habit">✏️</button>
              <button className="plan-day-remove" onClick={() => onDeleteHabit(habit.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { TrainingPlan, PlanDay, PlanDayType, WorkoutTemplate } from '../types'

interface PlanSectionProps {
  activePlan: TrainingPlan | null
  templates: WorkoutTemplate[]
  onSavePlan: (plan: TrainingPlan) => void
  onDeletePlan: () => void
}

const DAY_TYPE_LABELS: Record<PlanDayType, string> = {
  workout: 'Workout',
  run: 'Run',
  rest: 'Rest',
}

const DAY_TYPE_ICONS: Record<PlanDayType, string> = {
  workout: '🏋️',
  run: '🏃',
  rest: '😴',
}

export function getTodayPlanDay(plan: TrainingPlan): { day: PlanDay; cycleIndex: number } | null {
  const start = new Date(plan.startDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  if (daysSinceStart < 0) return null
  const cycleIndex = daysSinceStart % plan.days.length
  return { day: plan.days[cycleIndex], cycleIndex }
}

export function getUpcomingPlanDays(plan: TrainingPlan, count = 4): Array<{ day: PlanDay; cycleIndex: number; daysFromNow: number }> {
  const start = new Date(plan.startDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  if (daysSinceStart < 0) return []
  return Array.from({ length: count }, (_, i) => {
    const daysFromNow = i + 1
    const cycleIndex = (daysSinceStart + daysFromNow) % plan.days.length
    return { day: plan.days[cycleIndex], cycleIndex, daysFromNow }
  })
}

export default function PlanSection({ activePlan, templates, onSavePlan, onDeletePlan }: PlanSectionProps) {
  const [editing, setEditing] = useState(false)
  const [planName, setPlanName] = useState(activePlan?.name ?? 'My Training Plan')
  const [startDate, setStartDate] = useState(activePlan?.startDate ?? new Date().toISOString().split('T')[0])
  const [days, setDays] = useState<PlanDay[]>(activePlan?.days ?? [])

  const openEditor = () => {
    setPlanName(activePlan?.name ?? 'My Training Plan')
    setStartDate(activePlan?.startDate ?? new Date().toISOString().split('T')[0])
    setDays(activePlan?.days ?? [])
    setEditing(true)
  }

  const addDay = (type: PlanDayType) => {
    const newDay: PlanDay = { type, templateId: type === 'workout' ? templates[0]?.id : undefined }
    setDays(prev => [...prev, newDay])
  }

  const removeDay = (idx: number) => setDays(prev => prev.filter((_, i) => i !== idx))

  const updateDay = (idx: number, patch: Partial<PlanDay>) =>
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))

  const moveDayUp = (idx: number) => {
    if (idx === 0) return
    setDays(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDayDown = (idx: number) => {
    setDays(prev => {
      if (idx === prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const handleSave = () => {
    if (!planName.trim() || days.length === 0) return
    const plan: TrainingPlan = {
      id: activePlan?.id ?? crypto.randomUUID(),
      name: planName.trim(),
      days,
      startDate,
      isActive: true,
    }
    onSavePlan(plan)
    setEditing(false)
  }

  const todayEntry = activePlan ? getTodayPlanDay(activePlan) : null
  const upcoming = activePlan ? getUpcomingPlanDays(activePlan) : []

  if (editing) {
    return (
      <div className="plan-editor">
        <div className="plan-editor-header">
          <h3 className="plan-editor-title">{activePlan ? 'Edit Plan' : 'Create Training Plan'}</h3>
          <button className="btn-notes-cancel" onClick={() => setEditing(false)}>Cancel</button>
        </div>

        <div className="form-group">
          <label className="form-label">Plan name</label>
          <input className="input" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="My Training Plan" />
        </div>

        <div className="form-group">
          <label className="form-label">Start date <span className="form-label-hint">(day 1 of cycle)</span></label>
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Cycle ({days.length} {days.length === 1 ? 'day' : 'days'}, repeats forever)</label>

          <div className="plan-days-list">
            {days.map((day, idx) => (
              <div key={idx} className="plan-day-row">
                <div className="plan-day-row-left">
                  <span className="plan-day-num">Day {idx + 1}</span>
                  <span className="plan-day-icon">{DAY_TYPE_ICONS[day.type]}</span>
                  <select
                    className="rest-select"
                    value={day.type}
                    onChange={e => updateDay(idx, { type: e.target.value as PlanDayType, templateId: e.target.value === 'workout' ? templates[0]?.id : undefined })}
                  >
                    <option value="workout">Workout</option>
                    <option value="run">Run</option>
                    <option value="rest">Rest</option>
                  </select>
                  {day.type === 'workout' && (
                    <select
                      className="rest-select plan-template-select"
                      value={day.templateId ?? ''}
                      onChange={e => updateDay(idx, { templateId: e.target.value })}
                    >
                      {templates.length === 0
                        ? <option value="">No templates</option>
                        : templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                      }
                    </select>
                  )}
                </div>
                <div className="plan-day-row-actions">
                  <button className="plan-day-move" onClick={() => moveDayUp(idx)} disabled={idx === 0} title="Move up">↑</button>
                  <button className="plan-day-move" onClick={() => moveDayDown(idx)} disabled={idx === days.length - 1} title="Move down">↓</button>
                  <button className="plan-day-remove" onClick={() => removeDay(idx)}>×</button>
                </div>
              </div>
            ))}
          </div>

          <div className="plan-add-day-row">
            {(['workout', 'run', 'rest'] as PlanDayType[]).map(type => (
              <button key={type} className="plan-add-day-btn" onClick={() => addDay(type)}>
                + {DAY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="plan-editor-footer">
          {activePlan && (
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--error)' }} onClick={() => { onDeletePlan(); setEditing(false) }}>
              Delete Plan
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!planName.trim() || days.length === 0}
            style={{ marginLeft: 'auto' }}
          >
            {activePlan ? 'Save Changes' : 'Activate Plan'}
          </button>
        </div>
      </div>
    )
  }

  if (!activePlan) {
    return (
      <div className="plan-empty-card" onClick={openEditor}>
        <span className="plan-empty-icon">📋</span>
        <div>
          <div className="plan-empty-title">Set up a training plan</div>
          <div className="plan-empty-sub">Define your weekly rotation — Full Body A, run, rest…</div>
        </div>
        <span className="plan-empty-arrow">→</span>
      </div>
    )
  }

  return (
    <div className="plan-card">
      <div className="plan-card-header">
        <div className="plan-card-title-row">
          <span className="plan-card-name">{activePlan.name}</span>
          <button className="btn-edit plan-edit-btn" onClick={openEditor}>Edit</button>
        </div>
        {todayEntry && (
          <div className="plan-today-row">
            <span className="plan-today-label">Today</span>
            <span className={`plan-today-badge plan-badge-${todayEntry.day.type}`}>
              {DAY_TYPE_ICONS[todayEntry.day.type]}{' '}
              {todayEntry.day.type === 'workout'
                ? (templates.find(t => t.id === todayEntry.day.templateId)?.name ?? 'Workout')
                : DAY_TYPE_LABELS[todayEntry.day.type]}
            </span>
            <span className="plan-cycle-pos">Day {todayEntry.cycleIndex + 1}/{activePlan.days.length}</span>
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="plan-upcoming">
          {upcoming.map(({ day, cycleIndex, daysFromNow }) => (
            <div key={daysFromNow} className="plan-upcoming-row">
              <span className="plan-upcoming-day">
                {daysFromNow === 1 ? 'Tomorrow' : `In ${daysFromNow}d`}
              </span>
              <span className={`plan-upcoming-badge plan-badge-${day.type}`}>
                {DAY_TYPE_ICONS[day.type]}{' '}
                {day.type === 'workout'
                  ? (templates.find(t => t.id === day.templateId)?.name ?? 'Workout')
                  : DAY_TYPE_LABELS[day.type]}
              </span>
              <span className="plan-upcoming-pos">Day {cycleIndex + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

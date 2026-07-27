import { useState } from 'react'
import type { TrainingPlan, PlanDay, PlanDayType, PlanCheckIn, WorkoutTemplate } from '../types'

interface PlanSectionProps {
  activePlan: TrainingPlan | null
  templates: WorkoutTemplate[]
  onSavePlan: (plan: TrainingPlan) => void
  onDeletePlan: () => void
  onCompleteDay: () => void
  onSkipDay: () => void
}

export const DAY_TYPE_LABELS: Record<PlanDayType, string> = {
  workout: 'Workout',
  run: 'Run',
  rest: 'Rest',
}

export const DAY_TYPE_ICONS: Record<PlanDayType, string> = {
  workout: '🏋️',
  run: '🏃',
  rest: '😴',
}

export function getPlanStreak(checkIns: PlanCheckIn[]): number {
  const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (const ci of sorted) {
    if (!ci.completed) break
    streak++
  }
  return streak
}

export function getTodayPlanDay(plan: TrainingPlan): { day: PlanDay; cycleIndex: number } {
  const idx = plan.currentCycleIndex % plan.days.length
  return { day: plan.days[idx], cycleIndex: idx }
}

export function getUpcomingPlanDays(plan: TrainingPlan, count = 3): Array<{ day: PlanDay; cycleIndex: number; offset: number }> {
  return Array.from({ length: count }, (_, i) => {
    const offset = i + 1
    const cycleIndex = (plan.currentCycleIndex + offset) % plan.days.length
    return { day: plan.days[cycleIndex], cycleIndex, offset }
  })
}

export default function PlanSection({
  activePlan,
  templates,
  onSavePlan,
  onDeletePlan,
  onCompleteDay,
  onSkipDay,
}: PlanSectionProps) {
  const [editing, setEditing] = useState(false)
  const [planName, setPlanName] = useState(activePlan?.name ?? 'My Training Plan')
  const [days, setDays] = useState<PlanDay[]>(activePlan?.days ?? [])

  const openEditor = () => {
    setPlanName(activePlan?.name ?? 'My Training Plan')
    setDays(activePlan?.days ?? [])
    setEditing(true)
  }

  const addDay = (type: PlanDayType) =>
    setDays(prev => [...prev, { type, templateId: type === 'workout' ? templates[0]?.id : undefined }])

  const removeDay = (idx: number) => setDays(prev => prev.filter((_, i) => i !== idx))

  const updateDay = (idx: number, patch: Partial<PlanDay>) =>
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))

  const moveDayUp = (idx: number) => {
    if (idx === 0) return
    setDays(prev => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n })
  }

  const moveDayDown = (idx: number) =>
    setDays(prev => {
      if (idx === prev.length - 1) return prev
      const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n
    })

  const handleSave = () => {
    if (!planName.trim() || days.length === 0) return
    onSavePlan({
      id: activePlan?.id ?? crypto.randomUUID(),
      name: planName.trim(),
      days,
      currentCycleIndex: activePlan?.currentCycleIndex ?? 0,
      checkIns: activePlan?.checkIns ?? [],
      startDate: activePlan?.startDate ?? new Date().toISOString().split('T')[0],
      isActive: true,
    })
    setEditing(false)
  }

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
          <label className="form-label">Cycle ({days.length} {days.length === 1 ? 'day' : 'days'}, repeats forever)</label>
          <div className="plan-days-list">
            {days.map((day, idx) => (
              <div key={idx} className="plan-day-row">
                <div className="plan-day-row-left">
                  <span className="plan-day-num">Step {idx + 1}</span>
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
                  <button className="plan-day-move" onClick={() => moveDayUp(idx)} disabled={idx === 0}>↑</button>
                  <button className="plan-day-move" onClick={() => moveDayDown(idx)} disabled={idx === days.length - 1}>↓</button>
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
          <div className="plan-empty-sub">Define your cycle — Full Body A, run, rest…</div>
        </div>
        <span className="plan-empty-arrow">→</span>
      </div>
    )
  }

  const { day: todayDay, cycleIndex: todayCycleIndex } = getTodayPlanDay(activePlan)
  const upcoming = getUpcomingPlanDays(activePlan)
  const streak = getPlanStreak(activePlan.checkIns)
  const todayStr = new Date().toISOString().split('T')[0]
  const alreadyCheckedInToday = activePlan.checkIns.some(ci => ci.date === todayStr)

  const templateName = todayDay.type === 'workout'
    ? (templates.find(t => t.id === todayDay.templateId)?.name ?? 'Workout')
    : DAY_TYPE_LABELS[todayDay.type]

  return (
    <div className="plan-card">
      <div className="plan-card-header">
        <div className="plan-card-title-row">
          <div className="plan-card-title-left">
            <span className="plan-card-name">{activePlan.name}</span>
            {streak > 0 && (
              <span className="plan-streak-mini">🔥 {streak}</span>
            )}
          </div>
          <button className="btn-edit plan-edit-btn" onClick={openEditor}>Edit</button>
        </div>

        <div className="plan-today-row">
          <span className="plan-today-label">Next up</span>
          <span className={`plan-today-badge plan-badge-${todayDay.type}`}>
            {DAY_TYPE_ICONS[todayDay.type]} {templateName}
          </span>
          <span className="plan-cycle-pos">Step {todayCycleIndex + 1}/{activePlan.days.length}</span>
        </div>

        {!alreadyCheckedInToday && (
          <div className="plan-action-row">
            <button className="plan-btn-done" onClick={onCompleteDay}>
              ✓ Done
            </button>
            <button className="plan-btn-skip" onClick={onSkipDay}>
              Skip
            </button>
          </div>
        )}
        {alreadyCheckedInToday && (
          <div className="plan-checked-today">
            {activePlan.checkIns.find(ci => ci.date === todayStr)?.completed
              ? '✓ Completed today'
              : '✗ Skipped today — same step tomorrow'}
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="plan-upcoming">
          {upcoming.map(({ day, cycleIndex, offset }) => (
            <div key={offset} className="plan-upcoming-row">
              <span className="plan-upcoming-day">
                {offset === 1 ? 'After this' : `+${offset} steps`}
              </span>
              <span className={`plan-upcoming-badge plan-badge-${day.type}`}>
                {DAY_TYPE_ICONS[day.type]}{' '}
                {day.type === 'workout'
                  ? (templates.find(t => t.id === day.templateId)?.name ?? 'Workout')
                  : DAY_TYPE_LABELS[day.type]}
              </span>
              <span className="plan-upcoming-pos">Step {cycleIndex + 1}</span>
            </div>
          ))}
        </div>
      )}

      {activePlan.checkIns.length > 0 && (
        <div className="plan-history">
          <div className="plan-history-label">Recent history</div>
          <div className="plan-history-dots">
            {[...activePlan.checkIns]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 14)
              .reverse()
              .map(ci => (
                <div
                  key={ci.id}
                  className={`plan-history-dot ${ci.completed ? 'done' : 'skipped'}`}
                  title={`${ci.date}: ${ci.completed ? 'Completed' : 'Skipped'} (Step ${ci.cycleIndex + 1})`}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

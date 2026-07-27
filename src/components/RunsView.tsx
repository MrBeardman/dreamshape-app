import { useState } from 'react'
import type { RunLog } from '../types'

interface RunsViewProps {
  runLogs: RunLog[]
  onAddRun: (run: RunLog) => void
  onDeleteRun: (id: string) => void
}

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /km`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`
  return `${s}s`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseDurationInput(hStr: string, mStr: string, sStr: string): number {
  return (Number(hStr) || 0) * 3600 + (Number(mStr) || 0) * 60 + (Number(sStr) || 0)
}

function calcPace(distanceKm: number, durationSec: number): number {
  if (distanceKm <= 0) return 0
  return Math.round(durationSec / distanceKm)
}

export default function RunsView({ runLogs, onAddRun, onDeleteRun }: RunsViewProps) {
  const [showForm, setShowForm] = useState(false)

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formDistance, setFormDistance] = useState('')
  const [formDurH, setFormDurH] = useState('')
  const [formDurM, setFormDurM] = useState('')
  const [formDurS, setFormDurS] = useState('')
  const [formPaceOverride, setFormPaceOverride] = useState('')
  const [formHR, setFormHR] = useState('')
  const [formDifficulty, setFormDifficulty] = useState(5)
  const [formNotes, setFormNotes] = useState('')

  const distanceKm = Number(formDistance) || 0
  const durationSec = parseDurationInput(formDurH, formDurM, formDurS)
  const calculatedPace = distanceKm > 0 && durationSec > 0 ? calcPace(distanceKm, durationSec) : 0

  const handleSubmit = () => {
    if (!formDistance || durationSec === 0) return

    const paceIsManual = formPaceOverride.trim() !== ''
    let finalPace = calculatedPace

    if (paceIsManual) {
      const parts = formPaceOverride.split(':')
      if (parts.length === 2) {
        finalPace = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0)
      }
    }

    const run: RunLog = {
      id: crypto.randomUUID(),
      date: new Date(formDate).toISOString(),
      distance: distanceKm,
      duration: durationSec,
      averagePace: finalPace,
      paceIsManual,
      averageHR: formHR ? Number(formHR) : undefined,
      difficulty: formDifficulty,
      notes: formNotes.trim() || undefined,
    }

    onAddRun(run)
    setShowForm(false)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDistance('')
    setFormDurH('')
    setFormDurM('')
    setFormDurS('')
    setFormPaceOverride('')
    setFormHR('')
    setFormDifficulty(5)
    setFormNotes('')
  }

  const sorted = [...runLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="runs-view">
      <div className="runs-header">
        <h3 className="section-title">Run Diary</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          + Log Run
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="runs-empty">
          <p>No runs logged yet. Start tracking your runs!</p>
        </div>
      )}

      <div className="runs-list">
        {sorted.map(run => (
          <div key={run.id} className="run-card">
            <div className="run-card-top">
              <div className="run-card-date">{formatDate(run.date)}</div>
              <button className="btn-remove" onClick={() => onDeleteRun(run.id)}>×</button>
            </div>
            <div className="run-card-stats">
              <div className="run-stat">
                <span className="run-stat-val">{run.distance.toFixed(2)} km</span>
                <span className="run-stat-label">Distance</span>
              </div>
              <div className="run-stat">
                <span className="run-stat-val">{formatDuration(run.duration)}</span>
                <span className="run-stat-label">Duration</span>
              </div>
              <div className="run-stat">
                <span className="run-stat-val">{formatPace(run.averagePace)}</span>
                <span className="run-stat-label">Avg Pace</span>
              </div>
              {run.averageHR && (
                <div className="run-stat">
                  <span className="run-stat-val">{run.averageHR} bpm</span>
                  <span className="run-stat-label">Avg HR</span>
                </div>
              )}
              <div className="run-stat">
                <span className="run-stat-val">{run.difficulty}/10</span>
                <span className="run-stat-label">Effort</span>
              </div>
            </div>
            {run.notes && <p className="run-card-notes">{run.notes}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet modal-sheet-tall" onClick={e => e.stopPropagation()}>
            <h3 className="modal-sheet-title">Log a Run</h3>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="input"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Distance (km)</label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 5.02"
                value={formDistance}
                onChange={e => setFormDistance(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration</label>
              <div className="duration-row">
                <input
                  type="number"
                  className="input duration-input"
                  placeholder="0"
                  value={formDurH}
                  onChange={e => setFormDurH(e.target.value)}
                  min="0"
                />
                <span className="duration-sep">h</span>
                <input
                  type="number"
                  className="input duration-input"
                  placeholder="0"
                  value={formDurM}
                  onChange={e => setFormDurM(e.target.value)}
                  min="0"
                  max="59"
                />
                <span className="duration-sep">m</span>
                <input
                  type="number"
                  className="input duration-input"
                  placeholder="0"
                  value={formDurS}
                  onChange={e => setFormDurS(e.target.value)}
                  min="0"
                  max="59"
                />
                <span className="duration-sep">s</span>
              </div>
              {calculatedPace > 0 && (
                <p className="form-hint">Calculated pace: {formatPace(calculatedPace)}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Avg Pace override <span className="form-label-hint">(optional, format mm:ss)</span></label>
              <input
                type="text"
                className="input"
                placeholder={calculatedPace > 0 ? formatPace(calculatedPace).replace(' /km', '') : 'e.g. 5:30'}
                value={formPaceOverride}
                onChange={e => setFormPaceOverride(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Avg Heart Rate (bpm) <span className="form-label-hint">(optional)</span></label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 155"
                value={formHR}
                onChange={e => setFormHR(e.target.value)}
                min="0"
                max="250"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Effort / Difficulty: <strong>{formDifficulty}/10</strong></label>
              <input
                type="range"
                className="difficulty-slider"
                min="1"
                max="10"
                value={formDifficulty}
                onChange={e => setFormDifficulty(Number(e.target.value))}
              />
              <div className="difficulty-labels">
                <span>Easy</span>
                <span>Max</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes <span className="form-label-hint">(optional)</span></label>
              <textarea
                className="input"
                placeholder="How did it feel?"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="modal-sheet-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!formDistance || durationSec === 0}
              >
                Save Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

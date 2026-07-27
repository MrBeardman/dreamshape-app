import { useState } from 'react'
import type { RunLog } from '../types'

interface LogRunModalProps {
  onAdd: (run: RunLog) => void
  onClose: () => void
}

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /km`
}

function parseDurationInput(hStr: string, mStr: string, sStr: string): number {
  return (Number(hStr) || 0) * 3600 + (Number(mStr) || 0) * 60 + (Number(sStr) || 0)
}

function calcPace(distanceKm: number, durationSec: number): number {
  if (distanceKm <= 0) return 0
  return Math.round(durationSec / distanceKm)
}

export default function LogRunModal({ onAdd, onClose }: LogRunModalProps) {
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

    onAdd(run)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
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
  )
}

import type { RunLog } from '../types'

interface RunsViewProps {
  runLogs: RunLog[]
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

export default function RunsView({ runLogs, onDeleteRun }: RunsViewProps) {
  const sorted = [...runLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="runs-view">
      <div className="runs-header">
        <h3 className="section-title">Run Diary</h3>
      </div>

      {sorted.length === 0 && (
        <div className="runs-empty">
          <p>No runs logged yet. Log a run from the Home screen to start tracking.</p>
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
    </div>
  )
}

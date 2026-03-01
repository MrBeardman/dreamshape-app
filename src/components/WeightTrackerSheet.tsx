import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { WeightEntry } from '../types'

interface WeightTrackerSheetProps {
  weightEntries: WeightEntry[]
  onAdd: (entry: WeightEntry) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WeightTrackerSheet({ weightEntries, onAdd, onDelete, onClose }: WeightTrackerSheetProps) {
  const [input, setInput] = useState('')

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const lowest = sorted.length > 0 ? Math.min(...sorted.map(e => e.weight)) : 0
  const highest = sorted.length > 0 ? Math.max(...sorted.map(e => e.weight)) : 0

  const chartData = sorted.slice(-30).map(e => ({
    date: new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight,
    rawDate: e.date,
  }))

  const recentEntries = [...sorted].reverse().slice(0, 12)

  const handleLog = () => {
    const w = parseFloat(input)
    if (!w || w <= 0) return
    onAdd({
      id: crypto.randomUUID(),
      date: todayISO(),
      weight: Math.round(w * 10) / 10,
    })
    setInput('')
  }

  return (
    <div className="progress-sheet-overlay" onClick={onClose}>
      <div className="progress-sheet" onClick={e => e.stopPropagation()}>
        <div className="progress-sheet-handle" />

        {/* Header */}
        <div className="progress-sheet-header">
          <div className="progress-sheet-title-row">
            <h3 className="progress-sheet-title">Body Weight</h3>
            <button className="progress-sheet-close" onClick={onClose}>✕</button>
          </div>
          {latest && (
            <div className="progress-sheet-pr">{latest.weight} kg</div>
          )}
        </div>

        {/* Log form */}
        <div className="weight-log-form">
          <input
            className="weight-log-input"
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLog() }}
            autoFocus
          />
          <button
            className="weight-log-btn"
            onClick={handleLog}
            disabled={!input || parseFloat(input) <= 0}
          >
            Log Today
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="progress-sheet-empty">
            <p>No weight entries yet.</p>
            <p>Log your first weight above to start tracking your progress.</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            {sorted.length >= 2 && (
              <div className="weight-stats-row">
                <div className="weight-stat">
                  <span className="weight-stat-val">{lowest} kg</span>
                  <span className="weight-stat-label">Lowest</span>
                </div>
                <div className="weight-stat">
                  <span className="weight-stat-val">{highest} kg</span>
                  <span className="weight-stat-label">Highest</span>
                </div>
                <div className="weight-stat">
                  <span
                    className="weight-stat-val"
                    style={{ color: latest.weight < sorted[0].weight ? 'var(--success)' : latest.weight > sorted[0].weight ? 'var(--error)' : 'var(--text-primary)' }}
                  >
                    {latest.weight > sorted[0].weight ? '+' : ''}{Math.round((latest.weight - sorted[0].weight) * 10) / 10} kg
                  </span>
                  <span className="weight-stat-label">Change</span>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="progress-chart-wrapper">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#555"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#555"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    domain={['auto', 'auto']}
                    tickFormatter={v => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | undefined) => [value != null ? `${value} kg` : '', 'Weight']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#f5c518"
                    strokeWidth={2}
                    dot={{ fill: '#f5c518', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#ffffff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* History */}
            <div className="progress-sessions">
              <div className="progress-sessions-title">History</div>
              {recentEntries.map(entry => (
                <div key={entry.id} className="progress-session-row weight-history-row">
                  <span className="progress-session-date">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="progress-session-detail" />
                  <span className="progress-session-max">{entry.weight} kg</span>
                  <button
                    className="weight-history-delete"
                    onClick={() => onDelete(entry.id)}
                    aria-label="Delete entry"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

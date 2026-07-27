import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getExerciseHistory, estimateOneRepMax } from '../lib/exerciseStats'
import type { WorkoutLog } from '../types'

interface ExerciseProgressSheetProps {
  exerciseName: string
  workoutLogs: WorkoutLog[]
  onClose: () => void
  trackingMode?: 'weight-reps' | 'time'
}

export default function ExerciseProgressSheet({ exerciseName, workoutLogs, onClose, trackingMode }: ExerciseProgressSheetProps) {
  const isTimeMode = trackingMode === 'time'
  const [metric, setMetric] = useState<'weight' | 'volume'>('weight')

  const sessions = useMemo(
    () => getExerciseHistory(workoutLogs, exerciseName),
    [workoutLogs, exerciseName]
  )

  const bestPR = sessions.length > 0 ? Math.max(...sessions.map(s => isTimeMode ? s.maxDuration : s.maxWeight)) : 0
  const estimated1RM = useMemo(
    () => isTimeMode ? null : estimateOneRepMax(workoutLogs, exerciseName),
    [workoutLogs, exerciseName, isTimeMode]
  )

  const chartData = sessions.slice(-16).map(s => ({
    date: new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: isTimeMode ? s.maxDuration : s.maxWeight,
    volume: Math.round(s.totalVolume),
    sets: s.sets,
    rawDate: s.date,
  }))

  const recentSessions = [...sessions].reverse().slice(0, 8)

  return (
    <div className="progress-sheet-overlay" onClick={onClose}>
      <div className="progress-sheet" onClick={e => e.stopPropagation()}>
        {/* Handle bar */}
        <div className="progress-sheet-handle" />

        {/* Header */}
        <div className="progress-sheet-header">
          <div className="progress-sheet-title-row">
            <h3 className="progress-sheet-title">{exerciseName}</h3>
            <button className="progress-sheet-close" onClick={onClose}>✕</button>
          </div>
          <div className="progress-sheet-stats-row">
            {bestPR > 0 && (
              <div className="progress-sheet-stat">
                <span className="progress-sheet-stat-label">{isTimeMode ? 'Longest hold' : 'Best'}</span>
                <span className="progress-sheet-stat-val">{isTimeMode ? `${bestPR}s` : `${bestPR} kg`}</span>
              </div>
            )}
            {estimated1RM && (
              <div className="progress-sheet-stat">
                <span className="progress-sheet-stat-label">Est. 1RM</span>
                <span className="progress-sheet-stat-val">{estimated1RM} kg</span>
              </div>
            )}
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="progress-sheet-empty">
            <p>No history yet for this exercise.</p>
            <p>Complete a workout with {exerciseName} to see your progress here.</p>
          </div>
        ) : (
          <>
            {/* Metric toggle — Volume doesn't apply to time-tracked exercises, so it's
                hidden there and the chart just always plots duration. */}
            {!isTimeMode && (
              <div className="progress-metric-toggle">
                <button
                  className={`metric-btn ${metric === 'weight' ? 'active' : ''}`}
                  onClick={() => setMetric('weight')}
                >
                  Max Weight
                </button>
                <button
                  className={`metric-btn ${metric === 'volume' ? 'active' : ''}`}
                  onClick={() => setMetric('volume')}
                >
                  Volume
                </button>
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
                    width={32}
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
                    formatter={(value: number | undefined) => [
                      value !== undefined ? (isTimeMode ? `${value}s` : `${value} kg`) : '',
                      isTimeMode ? 'Duration' : metric === 'weight' ? 'Max weight' : 'Volume',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey={isTimeMode || metric === 'weight' ? 'weight' : 'volume'}
                    stroke="#f5c518"
                    strokeWidth={2}
                    dot={{ fill: '#f5c518', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#ffffff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Recent sessions */}
            <div className="progress-sessions">
              <div className="progress-sessions-title">Recent Sessions</div>
              {recentSessions.map((session, idx) => (
                <div key={idx} className="progress-session-row">
                  <span className="progress-session-date">
                    {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                  <span className="progress-session-detail">
                    {(() => {
                      const working = session.sets.filter(s => (s.type ?? 'working') === 'working')
                      const setsToShow = working.length > 0 ? working : session.sets
                      return setsToShow.map(s => isTimeMode ? `${s.reps}s` : `${s.weight}×${s.reps}`).join('  ·  ')
                    })()}
                  </span>
                  <span className="progress-session-max">{isTimeMode ? `${session.maxDuration}s` : `${session.maxWeight} kg`}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

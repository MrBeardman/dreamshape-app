import { useState } from 'react'
import type { UserProfile, WorkoutLog } from '../types'

interface ProfileViewProps {
  userProfile: UserProfile
  workoutLogs: WorkoutLog[]
  onUpdateProfile: (profile: UserProfile) => void
  onSignOut: () => void
}

export default function ProfileView({
  userProfile,
  workoutLogs,
  onUpdateProfile,
  onSignOut,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(userProfile.name)

  const handleSave = () => {
    onUpdateProfile({ ...userProfile, name })
    setIsEditing(false)
  }

  const getTotalVolume = () => {
    return workoutLogs.reduce((total, workout) => {
      return total + workout.exercises.reduce((exSum, exercise) => {
        return exSum + exercise.sets.reduce((setSum, set) => {
          return setSum + (set.weight * set.reps)
        }, 0)
      }, 0)
    }, 0)
  }

  const getTotalDuration = () => {
    const totalSeconds = workoutLogs.reduce((sum, w) => sum + w.duration, 0)
    const hours = Math.floor(totalSeconds / 3600)
    return hours
  }

  const getWeeklyGoalProgress = () => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const thisWeekWorkouts = workoutLogs.filter(w => {
      const workoutDate = new Date(w.date)
      return workoutDate >= weekStart
    }).length

    const goal = 4 // 4 workouts per week goal
    return Math.min((thisWeekWorkouts / goal) * 100, 100)
  }

  const getConsistencyScore = () => {
    if (workoutLogs.length === 0) return 0
    
    const last30Days = workoutLogs.filter(w => {
      const workoutDate = new Date(w.date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return workoutDate >= thirtyDaysAgo
    }).length

    return Math.min((last30Days / 12) * 100, 100) // 12 workouts in 30 days = 100%
  }

  const getVolumeProgress = () => {
    const monthlyGoal = 50000 // 50 tons
    const currentVolume = getTotalVolume()
    return Math.min((currentVolume / monthlyGoal) * 100, 100)
  }

  const getMostFrequentExercise = () => {
    const exerciseCounts: Record<string, number> = {}

    workoutLogs.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exerciseCounts[exercise.exerciseName] = (exerciseCounts[exercise.exerciseName] || 0) + 1
      })
    })

    const sorted = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])
    return sorted[0] ? sorted[0][0] : 'None'
  }

  const totalVolume = getTotalVolume()
  const totalHours = getTotalDuration()
  const favoriteExercise = getMostFrequentExercise()
  const weeklyProgress = getWeeklyGoalProgress()
  const consistencyScore = getConsistencyScore()
  const volumeProgress = getVolumeProgress()

  // SVG circle progress
  const CircleProgress = ({ percentage, color }: { percentage: number, color: string }) => {
    const radius = 36
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    return (
      <svg width="100" height="100" className="circle-progress">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="circle-progress-bar"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dy="0.35em"
          fontSize="20"
          fontWeight="bold"
          fill="white"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
    )
  }

  return (
    <div className="profile-view">
      {/* Header */}
      <div className="profile-header">
        <h2 className="view-title">Profile</h2>
      </div>

      {/* User Info Card */}
      <div 
        className="profile-user-card" 
        onClick={() => !isEditing && setIsEditing(true)}
        style={{ cursor: isEditing ? 'default' : 'pointer' }}
      >
        <div className="profile-avatar-large">
          {userProfile.name.charAt(0).toUpperCase()}
        </div>
        
        {isEditing ? (
          <div className="profile-edit-form" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
            <div className="profile-edit-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setName(userProfile.name)
                  setIsEditing(false)
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-user-info">
            <div className="profile-name-container">
              <h1 className="profile-name">{userProfile.name}</h1>
              {userProfile.role === 'creator' && (
                <span className="creator-badge" title="App Creator">
                  👑
                </span>
              )}
              {userProfile.role === 'tester' && (
                <span className="tester-badge" title="Beta Tester">
                  🧪
                </span>
              )}
            </div>
            <p className="profile-member-since">
              {userProfile.role === 'creator' && 'Creator'}
              {userProfile.role === 'tester' && 'Beta Tester'}
              {(!userProfile.role || userProfile.role === 'member') && 'Member'}
              {' '}since {new Date(userProfile.memberSince).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>

      {/* Progress Widgets */}
      <div className="profile-section">
        <h3 className="section-title">Goals</h3>
        
        <div className="progress-widgets">
          <div className="widget-card">
            <CircleProgress percentage={weeklyProgress} color="#fbbf24" />
            <div className="widget-info">
              <div className="widget-label">Weekly Goal</div>
              <div className="widget-sublabel">{Math.round(weeklyProgress / 25)} / 4 workouts</div>
            </div>
          </div>

          <div className="widget-card">
            <CircleProgress percentage={consistencyScore} color="#10b981" />
            <div className="widget-info">
              <div className="widget-label">Consistency</div>
              <div className="widget-sublabel">Last 30 days</div>
            </div>
          </div>

          <div className="widget-card">
            <CircleProgress percentage={volumeProgress} color="#3b82f6" />
            <div className="widget-info">
              <div className="widget-label">Volume</div>
              <div className="widget-sublabel">{(totalVolume / 1000).toFixed(1)}t total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="profile-section">
        <h3 className="section-title">Lifetime Stats</h3>
        
        <div className="stats-list">
          <div className="stat-item">
            <div className="stat-item-label">Total Workouts</div>
            <div className="stat-item-value">{workoutLogs.length}</div>
          </div>

          <div className="stat-item">
            <div className="stat-item-label">Total Volume</div>
            <div className="stat-item-value">{(totalVolume / 1000).toFixed(1)} tons</div>
          </div>

          <div className="stat-item">
            <div className="stat-item-label">Time Spent</div>
            <div className="stat-item-value">{totalHours} hours</div>
          </div>

          <div className="stat-item">
            <div className="stat-item-label">Favorite Exercise</div>
            <div className="stat-item-value">{favoriteExercise}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="profile-section">
        <h3 className="section-title">Data & Settings</h3>
        
        <div className="action-list">
          <button 
            className="action-item"
            onClick={() => {
              if (confirm('Export all your workout data?')) {
                const data = {
                  workouts: workoutLogs,
                  profile: userProfile,
                  exportedAt: new Date().toISOString()
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `dreamshape-backup-${new Date().toISOString().split('T')[0]}.json`
                a.click()
              }
            }}
          >
            <span>Export Data</span>
            <span className="action-arrow">→</span>
          </button>

          <button className="action-item action-item-danger" onClick={onSignOut}>
            <span>Sign Out</span>
            <span className="action-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

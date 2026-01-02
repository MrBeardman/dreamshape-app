import { useState } from 'react'
import type { UserProfile, WorkoutLog } from '../types'
import ThemeToggle from './ThemeToggle'

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

  return (
    <div className="profile-view">
      <div className="profile-view-header">
        <div className="profile-avatar-large">
          {userProfile.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-header">
          <h2>Profile</h2>
          <ThemeToggle />
        </div>

        {isEditing ? (
          <div className="profile-edit-form">
            <input
              type="text"
              className="profile-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
            <div className="profile-edit-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setName(userProfile.name)
                  setIsEditing(false)
                }}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info-section">
            <h1 className="profile-name-large">{userProfile.name}</h1>
            <p className="profile-member-since">
              Member since {new Date(userProfile.memberSince).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="profile-stats-section">
        <h2 className="section-title">📊 Your Stats</h2>

        <div className="profile-stats-grid">
          <div className="profile-stat-card">
            <div className="profile-stat-icon">💪</div>
            <div className="profile-stat-value">{workoutLogs.length}</div>
            <div className="profile-stat-label">Total Workouts</div>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-icon">⚡</div>
            <div className="profile-stat-value">{(totalVolume / 1000).toFixed(1)}t</div>
            <div className="profile-stat-label">Total Volume</div>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-icon">⏱️</div>
            <div className="profile-stat-value">{totalHours}h</div>
            <div className="profile-stat-label">Time Spent</div>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-icon">⭐</div>
            <div className="profile-stat-value-small">{favoriteExercise}</div>
            <div className="profile-stat-label">Favorite Exercise</div>
          </div>
        </div>
      </div>

      <div className="profile-info-section-details">
        <h2 className="section-title">ℹ️ About</h2>

        <div className="info-card">
          <p className="info-text">
            DreamShape helps you track your workouts, monitor progress, and achieve your fitness goals.
          </p>
          <p className="info-text">
            <strong>Version:</strong> 1.0.0
          </p>
          <p className="info-text">
            <strong>Created by:</strong> Jan Matyas
          </p>
        </div>
      </div>

      <div className="profile-danger-zone">
        <h2 className="section-title">⚠️ Data Management</h2>

        <div className="danger-card">
          <p className="danger-text">
            Your data is stored locally in your browser. Make sure to back up regularly!
          </p>
          <button className="btn-danger" onClick={() => {
            if (confirm('This will export all your data. Continue?')) {
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
          }}>
            Export Data
          </button>
          <div className="profile-actions">
            <button className="btn-sign-out" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

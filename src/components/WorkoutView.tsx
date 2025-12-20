import type { ActiveWorkout, WorkoutLog } from '../types'

interface WorkoutViewProps {
  activeWorkout: ActiveWorkout
  elapsedTime: number
  restTimer: number | null
  restDuration: number
  workoutLogs: WorkoutLog[]
  onCancel: () => void
  onFinish: () => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => void
  onToggleSetCompleted: (exerciseIndex: number, setIndex: number) => void
  onAddSet: (exerciseIndex: number) => void
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void
  onSetRestDuration: (duration: number) => void
  onSkipRest: () => void
}

export default function WorkoutView({
  activeWorkout,
  elapsedTime,
  restTimer,
  restDuration,
  workoutLogs,
  onCancel,
  onFinish,
  onUpdateSet,
  onToggleSetCompleted,
  onAddSet,
  onRemoveSet,
  onSetRestDuration,
  onSkipRest
}: WorkoutViewProps) {
  
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPersonalRecord = (exerciseName: string): number => {
    let maxWeight = 0
    
    workoutLogs.forEach(workout => {
      const exercise = workout.exercises.find(e => e.exerciseName === exerciseName)
      if (exercise) {
        exercise.sets.forEach(set => {
          if (set.weight > maxWeight) {
            maxWeight = set.weight
          }
        })
      }
    })
    
    return maxWeight
  }

  return (
    <div className="workout-view">
      <div className="workout-header">
        <button className="btn-back" onClick={onCancel}>
          ✕ Cancel
        </button>
        <h2>{activeWorkout.templateName}</h2>
        <button className="btn-finish" onClick={onFinish}>
          Finish
        </button>
      </div>

      {/* Workout Timer */}
      <div className="workout-timer">
        <div>
          <span className="timer-label">Workout Duration</span>
          <span className="timer-value">{formatElapsedTime(elapsedTime)}</span>
        </div>
        <div className="rest-settings">
          <label className="rest-label-small">Rest: </label>
          <select 
            className="rest-select"
            value={restDuration}
            onChange={(e) => onSetRestDuration(Number(e.target.value))}
          >
            <option value={60}>1:00</option>
            <option value={90}>1:30</option>
            <option value={120}>2:00</option>
            <option value={180}>3:00</option>
            <option value={240}>4:00</option>
            <option value={300}>5:00</option>
          </select>
        </div>
      </div>

      {/* Rest Timer Overlay */}
      {restTimer !== null && restTimer > 0 && (
        <div className="rest-timer-overlay">
          <div className="rest-timer-content">
            <span className="rest-label">Rest Time</span>
            <span className="rest-time">{formatRestTime(restTimer)}</span>
            <button 
              className="skip-rest-btn"
              onClick={onSkipRest}
            >
              Skip Rest
            </button>
          </div>
        </div>
      )}

      <div className="workout-exercises">
        {activeWorkout.exercises.map((exerciseLog, exerciseIndex) => {
          const pr = getPersonalRecord(exerciseLog.exerciseName)
          
          return (
            <div key={exerciseLog.exerciseId} className="workout-exercise">
              <div className="exercise-header">
                <h3 className="exercise-title">{exerciseLog.exerciseName}</h3>
                {pr > 0 && (
                  <span className="pr-badge">PR: {pr} kg</span>
                )}
              </div>
              
              <div className="sets-header">
                <span className="set-col">Set</span>
                <span className="kg-col">kg</span>
                <span className="reps-col">Reps</span>
                <span className="check-col">✓</span>
              </div>

              {exerciseLog.sets.map((set, setIndex) => (
                <div key={set.id} className={`set-row ${set.completed ? 'completed' : ''}`}>
                  <span className="set-number">{setIndex + 1}</span>
                  
                  <input
                    type="number"
                    className="set-input"
                    value={set.weight || ''}
                    onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'weight', Number(e.target.value))}
                    placeholder="0"
                  />
                  
                  <input
                    type="number"
                    className="set-input"
                    value={set.reps || ''}
                    onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'reps', Number(e.target.value))}
                    placeholder="0"
                  />
                  
                  <button
                    className={`check-btn ${set.completed ? 'completed' : ''}`}
                    onClick={() => onToggleSetCompleted(exerciseIndex, setIndex)}
                  >
                    {set.completed ? '✓' : ''}
                  </button>

                  {exerciseLog.sets.length > 1 && (
                    <button
                      className="remove-set-btn"
                      onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                className="add-set-btn"
                onClick={() => onAddSet(exerciseIndex)}
              >
                + Add Set
              </button>
            </div>
          )
        })}
      </div>

      <div className="workout-footer">
        <button className="btn-finish-large" onClick={onFinish}>
          Finish Workout
        </button>
      </div>
    </div>
  )
}

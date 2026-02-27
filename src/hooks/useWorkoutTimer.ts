import { useState, useEffect } from 'react'

interface ActiveRestTimer {
  exerciseIndex: number
  afterSetIndex: number
  timeRemaining: number
}

export function useWorkoutTimer(startTime: number | null) {
  const [elapsedTime, setElapsedTime] = useState(0)

  const [restDuration, setRestDuration] = useState<number>(() =>
    Number(localStorage.getItem('dreamshape_rest_duration') || '120')
  )

  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(() => {
    const saved = localStorage.getItem('dreamshape_rest_timer')
    if (!saved) return null
    try {
      const { exerciseIndex, afterSetIndex, endsAt } = JSON.parse(saved)
      const timeRemaining = Math.round((endsAt - Date.now()) / 1000)
      if (timeRemaining <= 0) {
        localStorage.removeItem('dreamshape_rest_timer')
        return null
      }
      return { exerciseIndex, afterSetIndex, timeRemaining }
    } catch {
      return null
    }
  })

  // Elapsed workout timer
  useEffect(() => {
    if (!startTime) {
      setElapsedTime(0)
      return
    }
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  // Persist rest duration setting
  useEffect(() => {
    localStorage.setItem('dreamshape_rest_duration', String(restDuration))
  }, [restDuration])

  // Persist rest timer using endsAt (absolute timestamp) so the remaining time is
  // correct even if the app was closed while the timer was running
  useEffect(() => {
    if (activeRestTimer && activeRestTimer.timeRemaining > 0) {
      localStorage.setItem('dreamshape_rest_timer', JSON.stringify({
        exerciseIndex: activeRestTimer.exerciseIndex,
        afterSetIndex: activeRestTimer.afterSetIndex,
        endsAt: Date.now() + activeRestTimer.timeRemaining * 1000,
      }))
    } else {
      localStorage.removeItem('dreamshape_rest_timer')
    }
  }, [activeRestTimer])

  // Inline per-set rest timer countdown
  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.timeRemaining <= 0) {
      if (activeRestTimer?.timeRemaining === 0) {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      }
      return
    }
    const interval = setInterval(() => {
      setActiveRestTimer(prev => {
        if (!prev || prev.timeRemaining <= 0) return null
        return { ...prev, timeRemaining: prev.timeRemaining - 1 }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [activeRestTimer])

  return {
    elapsedTime,
    restDuration,
    setRestDuration,
    activeRestTimer,
    setActiveRestTimer,
  }
}

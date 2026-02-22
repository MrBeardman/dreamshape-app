import { useState, useEffect } from 'react'

interface ActiveRestTimer {
  exerciseIndex: number
  afterSetIndex: number
  timeRemaining: number
}

export function useWorkoutTimer(startTime: number | null) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(120)
  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(null)

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

  // Global rest timer countdown (legacy overlay)
  useEffect(() => {
    if (restTimer === null || restTimer <= 0) {
      if (restTimer === 0) {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        setRestTimer(null)
      }
      return
    }
    const interval = setInterval(() => {
      setRestTimer(prev => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearInterval(interval)
  }, [restTimer])

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
    restTimer,
    setRestTimer,
    restDuration,
    setRestDuration,
    activeRestTimer,
    setActiveRestTimer,
  }
}

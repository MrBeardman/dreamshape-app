// ============================================
// NOTIFICATION HELPERS
// Schedules rest timer notifications via the Service Worker.
// Works when the app is backgrounded. On iOS, the SW may be killed
// for rests longer than ~30s with a fully locked screen — server-side
// push (see FEATURES.md #4) is the upgrade path for that case.
// ============================================

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function scheduleRestNotification(delay: number, exerciseName: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  if (Notification.permission !== 'granted') return
  const sw = await navigator.serviceWorker.ready
  if (!sw.active) return
  sw.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    delay,
    title: 'Rest complete! 💪',
    body: exerciseName ? `Time for your next set of ${exerciseName}` : 'Time for your next set',
  })
}

export async function cancelRestNotification(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const sw = await navigator.serviceWorker.ready
  if (!sw.active) return
  sw.active.postMessage({ type: 'CANCEL_NOTIFICATION' })
}

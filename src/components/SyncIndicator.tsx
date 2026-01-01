import { useEffect, useState } from 'react'

interface SyncIndicatorProps {
  isSyncing: boolean
  lastSyncTime: Date | null
}

export default function SyncIndicator({ isSyncing, lastSyncTime }: SyncIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never synced'
    
    const now = new Date()
    const diffMs = now.getTime() - lastSyncTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    return lastSyncTime.toLocaleDateString()
  }

  if (!isOnline) {
    return (
      <div className="sync-indicator offline">
        <span className="sync-dot"></span>
        <span className="sync-text">Offline</span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="sync-indicator syncing">
        <span className="sync-spinner"></span>
        <span className="sync-text">Syncing...</span>
      </div>
    )
  }

  return (
    <div className="sync-indicator synced">
      <span className="sync-check">✓</span>
      <span className="sync-text">{formatLastSync()}</span>
    </div>
  )
}
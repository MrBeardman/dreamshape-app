interface BottomNavProps {
  currentView: 'dashboard' | 'progress' | 'start' | 'library' | 'profile'
  onNavigate: (view: 'dashboard' | 'progress' | 'start' | 'library' | 'profile') => void
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        <span className="nav-label">Home</span>
      </button>

      <button
        className={`nav-item ${currentView === 'progress' ? 'active' : ''}`}
        onClick={() => onNavigate('progress')}
      >
        <span className="nav-label">History</span>
      </button>

      <button
        className={`nav-item nav-item-primary ${currentView === 'start' ? 'active' : ''}`}
        onClick={() => onNavigate('start')}
      >
        <span className="nav-label-primary">Start</span>
      </button>

      <button
        className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
        onClick={() => onNavigate('library')}
      >
        <span className="nav-label">Library</span>
      </button>

      <button
        className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
        onClick={() => onNavigate('profile')}
      >
        <span className="nav-label">Profile</span>
      </button>
    </nav>
  )
}

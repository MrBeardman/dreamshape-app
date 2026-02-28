type View = 'dashboard' | 'habits' | 'progress' | 'start' | 'nutrition' | 'profile'

interface BottomNavProps {
  currentView: View
  onNavigate: (view: View) => void
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
        <span className="nav-label">Home</span>
      </button>

      <button
        className={`nav-item ${currentView === 'habits' ? 'active' : ''}`}
        onClick={() => onNavigate('habits')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="4" height="4" rx="0.5"/>
          <line x1="10" y1="7" x2="21" y2="7"/>
          <rect x="3" y="13" width="4" height="4" rx="0.5"/>
          <line x1="10" y1="15" x2="21" y2="15"/>
          <polyline points="5 7 5 7" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <span className="nav-label">Habits</span>
      </button>

      <button
        className={`nav-item nav-item-primary ${currentView === 'start' ? 'active' : ''}`}
        onClick={() => onNavigate('start')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span className="nav-label-primary">Start</span>
      </button>

      <button
        className={`nav-item ${currentView === 'nutrition' ? 'active' : ''}`}
        onClick={() => onNavigate('nutrition')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
          <line x1="6" y1="1" x2="6" y2="4"/>
          <line x1="10" y1="1" x2="10" y2="4"/>
          <line x1="14" y1="1" x2="14" y2="4"/>
        </svg>
        <span className="nav-label">Nutrition</span>
      </button>

      <button
        className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
        onClick={() => onNavigate('profile')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span className="nav-label">Profile</span>
      </button>
    </nav>
  )
}

import { motion } from 'motion/react'

type View = 'dashboard' | 'exercises' | 'start' | 'history' | 'profile'

interface BottomNavProps {
  currentView: View
  onNavigate: (view: View) => void
}

// Frequent, tens-of-taps/day UI: kept fast and stiff rather than bouncy —
// a springy overshoot here would read as sluggish on repeat use.
const pillTransition = { type: 'spring', stiffness: 520, damping: 36, mass: 0.7 } as const

function NavPill() {
  return <motion.div className="nav-pill" layoutId="nav-pill" transition={pillTransition} />
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        {currentView === 'dashboard' && <NavPill />}
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
        <span className="nav-label">Home</span>
      </button>

      <button
        className={`nav-item ${currentView === 'exercises' ? 'active' : ''}`}
        onClick={() => onNavigate('exercises')}
      >
        {currentView === 'exercises' && <NavPill />}
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5h11"/>
          <path d="M6.5 17.5h11"/>
          <path d="M3 3v5"/>
          <path d="M21 3v5"/>
          <path d="M3 16v5"/>
          <path d="M21 16v5"/>
          <line x1="3" y1="8" x2="21" y2="8"/>
          <line x1="3" y1="16" x2="21" y2="16"/>
        </svg>
        <span className="nav-label">Exercises</span>
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
        className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
        onClick={() => onNavigate('history')}
      >
        {currentView === 'history' && <NavPill />}
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span className="nav-label">History</span>
      </button>

      <button
        className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
        onClick={() => onNavigate('profile')}
      >
        {currentView === 'profile' && <NavPill />}
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span className="nav-label">Profile</span>
      </button>
    </nav>
  )
}

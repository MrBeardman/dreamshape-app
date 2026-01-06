import type { UserProfile } from '../types'

interface SidebarNavProps {
  currentView: 'dashboard' | 'progress' | 'start' | 'library' | 'profile'
  onNavigate: (view: 'dashboard' | 'progress' | 'start' | 'library' | 'profile') => void
  userName: string
  userProfile?: UserProfile
}

export default function SidebarNav({ currentView, onNavigate, userName, userProfile }: SidebarNavProps) {
  return (
    <nav className="sidebar-nav">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">DS</div>
          <span>DreamShape</span>
        </div>
      </div>

      <div className="sidebar-nav-items">
        <button
          className={`sidebar-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>Home</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentView === 'progress' ? 'active' : ''}`}
          onClick={() => onNavigate('progress')}
        >
          <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span>History</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentView === 'start' ? 'active' : ''}`}
          onClick={() => onNavigate('start')}
        >
          <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Templates</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => onNavigate('library')}
        >
          <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>Library</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentView === 'profile' ? 'active' : ''}`}
          onClick={() => onNavigate('profile')}
        >
          <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Profile</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-role">
              {userProfile?.role === 'creator' && 'Creator'}
              {userProfile?.role === 'tester' && 'Beta Tester'}
              {(!userProfile?.role || userProfile.role === 'member') && 'Member'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

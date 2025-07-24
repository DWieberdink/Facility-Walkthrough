// Session management utilities
export interface UserSession {
  name: string
  email: string
  school: string
  dateWalked: string
  isLoggedIn: boolean
  lastLogin: string
}

const SESSION_KEY = 'survey_app_session'

export const sessionUtils = {
  // Save user session to localStorage
  saveSession: (session: Omit<UserSession, 'isLoggedIn' | 'lastLogin'>) => {
    const userSession: UserSession = {
      ...session,
      isLoggedIn: true,
      lastLogin: new Date().toISOString()
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSession))
  },

  // Get current session from localStorage
  getSession: (): UserSession | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) return null
      
      const session = JSON.parse(sessionData) as UserSession
      
      // Check if session is still valid (not expired)
      const lastLogin = new Date(session.lastLogin)
      const now = new Date()
      const hoursSinceLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)
      
      // Session expires after 24 hours
      if (hoursSinceLogin > 24) {
        sessionUtils.clearSession()
        return null
      }
      
      return session
    } catch (error) {
      console.error('Error parsing session data:', error)
      return null
    }
  },

  // Clear session (logout)
  clearSession: () => {
    localStorage.removeItem(SESSION_KEY)
  },

  // Check if user is logged in
  isLoggedIn: (): boolean => {
    const session = sessionUtils.getSession()
    return session?.isLoggedIn || false
  },

  // Update session data (for when user changes info)
  updateSession: (updates: Partial<Omit<UserSession, 'isLoggedIn' | 'lastLogin'>>) => {
    const currentSession = sessionUtils.getSession()
    if (currentSession) {
      const updatedSession: UserSession = {
        ...currentSession,
        ...updates,
        lastLogin: new Date().toISOString()
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession))
    }
  }
} 
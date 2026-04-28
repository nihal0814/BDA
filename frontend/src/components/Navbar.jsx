import { Link, useLocation } from 'react-router-dom'
import { Heart, BarChart3, Lightbulb, Brain, Zap } from 'lucide-react'
import { useState } from 'react'

const NAV_LINKS = [
  { path: '/', label: 'Home', icon: Heart },
  { path: '/risk', label: 'Risk Assessment', icon: BarChart3 },
  { path: '/dashboard', label: 'Dashboard', icon: Zap },
  { path: '/recommendations', label: 'Recommendations', icon: Lightbulb },
  { path: '/wellness-coach', label: 'Wellness Coach', icon: Brain },
]

export default function Navbar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-500 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:glow-accent transition-all duration-300">
              <Heart size={22} className="text-bg" />
            </div>
            <span className="font-display text-xl font-800 gradient-text hidden sm:inline">VitalIQ</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map(link => {
              const Icon = link.icon
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                    isActive
                      ? 'bg-accent/10 text-accent border border-accent/30 glow-accent'
                      : 'text-muted hover:text-text hover:bg-surface/50 border border-transparent'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm">{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-muted hover:text-text hover:bg-surface/50 transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-top-2">
            {NAV_LINKS.map(link => {
              const Icon = link.icon
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-medium ${
                    isActive
                      ? 'bg-accent/10 text-accent border border-accent/30'
                      : 'text-muted hover:text-text hover:bg-surface/50 border border-transparent'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}

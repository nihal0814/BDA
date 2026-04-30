import { Link } from 'react-router-dom'
import { Activity, Lightbulb, BarChart3, Brain, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react'

const FEATURES = [
  {
    to: '/risk',
    icon: <Activity size={28} />,
    title: 'Risk Assessment',
    description: 'Get your AI-powered health risk score (High/Medium/Low) with contributing factor analysis and probability charts.',
    color: '#22D3EE',
    glow: 'hover:glow-accent',
  },

  {
    to: '/recommendations',
    icon: <Lightbulb size={28} />,
    title: 'Recommendations',
    description: 'Receive personalized, actionable lifestyle recommendations prioritized by impact on your risk profile.',
    color: '#818CF8',
    glow: 'hover:shadow-[0_0_20px_rgba(129,140,248,0.2)]',
  },

  {
    to: '/dashboard',
    icon: <BarChart3 size={28} />,
    title: 'Dashboard',
    description: 'Visualize your complete health profile with radar charts, vitals tracking, and benchmark comparisons.',
    color: '#10B981',
    glow: 'hover:glow-success',
  },

  {
    to: '/wellness-coach',
    icon: <Brain size={28} />,
    title: 'AI Coach',
    description: 'Chat with an AI wellness coach powered by Mistral for personalized health guidance and risk explanations.',
    color: '#F59E0B',
    glow: 'hover:glow-warn',
  },
]

const STATS = [
  { icon: <Shield size={20} />, value: '3-Class', label: 'Risk Classification' },
  { icon: <TrendingUp size={20} />, label: 'ML Model', value: 'Random Forest' },
  { icon: <Zap size={20} />, value: '22+', label: 'Health Features' },
  { icon: <Activity size={20} />, value: 'Real-time', label: 'Risk Analysis' },
]

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-20 section-enter">
      {/* Hero Section */}
      <div className="text-center mb-20 space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium glow-accent">
          <Zap size={14} className="animate-pulse" />
          ML-Powered Health Risk Analysis
        </div>
        
        {/* Title */}
        <div className="space-y-4">
          <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-800 leading-tight">
            <span className="gradient-text">VitalIQ</span>
          </h1>
          <p className="text-muted text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Enter your health & lifestyle data and get instant AI-powered risk assessment, 
            personalized recommendations, and interactive health dashboards.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/risk"
            className="btn-primary whitespace-nowrap group"
          >
            Get Started 
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/dashboard"
            className="btn-secondary whitespace-nowrap"
          >
            View Dashboard
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        {STATS.map(({ icon, value, label }) => (
          <div 
            key={label} 
            className="glass rounded-xl p-6 border border-border/50 hover:border-accent/30 transition-all duration-300 card-hover group"
          >
            <div className="flex justify-center text-accent mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
            <p className="font-display font-700 text-lg md:text-xl text-text">{value}</p>
            <p className="text-xs text-muted mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Features Section */}
      <div className="space-y-6 mb-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-800 text-text">
            Everything You Need
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Comprehensive health analysis powered by advanced machine learning
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map(({ to, icon, title, description, color, glow }) => (
            <Link key={to} to={to} className="group h-full">
              <div className={`glass rounded-2xl p-8 border border-border/50 hover:border-[${color}]/30 ${glow} transition-all duration-300 h-full card-hover`}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-6"
                  style={{ background: `${color}15`, border: `1.5px solid ${color}30`, color }}
                >
                  {icon}
                </div>
                <h3 className="font-display text-xl font-700 text-text mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed mb-4">{description}</p>
                <div className="flex items-center gap-1 text-sm font-medium transition-colors group-hover:text-accent" style={{ color }}>
                  Open <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

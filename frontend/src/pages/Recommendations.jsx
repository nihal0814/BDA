import { useState } from 'react'
import HealthForm from '../components/HealthForm'
import { getRecommendations } from '../utils/api'
import { AlertTriangle, CheckCircle, Zap, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'

const PRIORITY_CONFIG = {
  High:   { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    dot: 'bg-red-400'    },
  Medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
  Low:    { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  dot: 'bg-green-400'  },
}

const RISK_COLORS = {
  High: '#EF4444', Medium: '#F59E0B', Low: '#10B981'
}

export default function Recommendations() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (data) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await getRecommendations(data)
      setResult(res)
      setTimeout(() => {
        document.getElementById('recs')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to connect to API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 section-enter">
      <div className="mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
          <Lightbulb size={14} />
          Personalized Action Plan
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-800 gradient-text">Health Recommendations</h1>
        <p className="text-muted text-lg max-w-3xl">Get AI-personalized lifestyle recommendations based on your health profile, prioritized by impact.</p>
      </div>

      <HealthForm onSubmit={handleSubmit} submitLabel="💡 Get My Recommendations" loading={loading} />

      {error && (
        <div className="mt-8 p-6 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div id="recs" className="mt-16 space-y-8 section-enter">
          {/* Risk summary */}
          <div className="glass rounded-2xl p-8 border border-border/50 card-hover">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div>
                <p className="text-muted text-sm uppercase tracking-widest mb-2 font-medium">Based on your risk profile</p>
                <h2 className="font-display text-4xl font-800" style={{ color: RISK_COLORS[result.risk_level] }}>
                  {result.risk_level} Risk
                </h2>
              </div>
              <div className="flex gap-6">
                {Object.entries(result.probabilities).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div className="text-3xl font-mono font-700" style={{ color: RISK_COLORS[k] }}>
                      {Math.round(v * 100)}%
                    </div>
                    <div className="text-xs text-muted font-medium">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Recommendations" value={result.recommendations.length} unit="items" color="accent" />
            <StatCard label="High Priority" value={result.recommendations.filter(r => r.priority === 'High').length} unit="urgent" color="danger" />
            <StatCard label="Risk Factors" value={result.top_factors.length} unit="detected" color="warn" />
          </div>

          {/* Recommendations */}
          <div>
            <h2 className="font-display text-3xl font-800 text-text mb-8">Personalized Action Plan</h2>

            {result.recommendations.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center border border-border/50 card-hover">
                <CheckCircle size={56} className="text-success mx-auto mb-4" />
                <p className="font-display text-2xl font-700 text-text mb-2">Great job! Your health metrics look good.</p>
                <p className="text-muted">Maintain your current lifestyle habits.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {result.recommendations.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, color }) {
  const colorMap = {
    accent:  'text-accent  border-accent/20  bg-accent/5',
    danger:  'text-red-400 border-red-500/20 bg-red-500/5',
    warn:    'text-warn    border-warn/20    bg-warn/5',
    success: 'text-green-400 border-green-500/20 bg-green-500/5',
  }
  return (
    <div className={`glass rounded-xl p-5 border ${colorMap[color]}`}>
      <p className="text-3xl font-mono font-700 text-inherit">{value}</p>
      <p className="text-xs text-muted mt-1 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-inherit/60 mt-0.5">{unit}</p>
    </div>
  )
}

function RecommendationCard({ rec, index }) {
  const [expanded, setExpanded] = useState(index === 0)
  const cfg = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.Medium

  return (
    <div
      className={`glass rounded-2xl overflow-hidden border ${cfg.border} transition-all duration-300`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-6 py-5 hover:bg-white/5 transition-colors text-left"
      >
        <span className="text-2xl">{rec.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              {rec.priority} Priority
            </span>
            <span className="text-xs text-muted">{rec.category}</span>
          </div>
          <p className="font-display font-600 text-text">{rec.title}</p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-muted flex-shrink-0" />
          : <ChevronDown size={16} className="text-muted flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-border/30 pt-4">
          <p className="text-muted text-sm mb-4 leading-relaxed">{rec.description}</p>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted mb-2">Action Steps</p>
            <ul className="space-y-2">
              {rec.action_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text">
                  <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

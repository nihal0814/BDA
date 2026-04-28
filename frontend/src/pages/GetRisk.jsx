import { useState } from 'react'
import HealthForm from '../components/HealthForm'
import { predictRisk } from '../utils/api'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import { AlertTriangle, CheckCircle, Zap, TrendingUp, BarChart3 } from 'lucide-react'

const RISK_CONFIG = {
  High:   { color: '#EF4444', icon: <AlertTriangle size={32} />, bg: 'bg-red-500/10',   border: 'border-red-500/30',   glow: 'glow-danger',  label: 'High Risk' },
  Medium: { color: '#F59E0B', icon: <Zap size={32} />,           bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', glow: 'glow-warn',   label: 'Medium Risk' },
  Low:    { color: '#10B981', icon: <CheckCircle size={32} />,   bg: 'bg-green-500/10',  border: 'border-green-500/30',  glow: 'glow-success', label: 'Low Risk' },
}

export default function GetRisk() {
  const [loading, setLoading]   = useState(false)
  const [result,  setResult]    = useState(null)
  const [error,   setError]     = useState(null)

  const handleSubmit = async (data) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await predictRisk(data)
      setResult(res)
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to connect to API. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 section-enter">
      {/* Header */}
      <div className="mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
          <BarChart3 size={14} />
          AI-Powered Analysis
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-800 gradient-text">Risk Assessment</h1>
        <p className="text-muted text-lg max-w-3xl">Fill in your health & lifestyle details for a comprehensive AI-powered risk analysis with contributing factor analysis.</p>
      </div>

      <HealthForm onSubmit={handleSubmit} submitLabel="🔍 Analyze My Risk" loading={loading} />

      {error && (
        <div className="mt-8 p-6 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div id="results" className="mt-16 space-y-8 section-enter">
          <h2 className="font-display text-3xl font-800 text-text">Your Results</h2>

          {/* Main risk badge */}
          <RiskBadge result={result} />

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProbabilityPieChart probabilities={result.probabilities} />
            <TopFactorsChart factors={result.top_factors} />
          </div>

          {/* Top factors detail */}
          {result.top_factors.length > 0 && (
            <FactorsDetail factors={result.top_factors} />
          )}
        </div>
      )}
    </div>
  )
}

function RiskBadge({ result }) {
  const cfg = RISK_CONFIG[result.risk_level] || RISK_CONFIG.Medium
  const confidence = Math.round(result.confidence * 100)

  return (
    <div className={`glass rounded-2xl p-8 md:p-10 border ${cfg.border} ${cfg.glow} risk-badge overflow-hidden relative`}>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${cfg.color}, transparent)` }} />
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className={`p-6 rounded-2xl ${cfg.bg} flex-shrink-0 transition-transform hover:scale-105`} style={{ color: cfg.color }}>
          {cfg.icon}
        </div>
        <div className="flex-1 text-center md:text-left">
          <p className="text-muted text-xs uppercase tracking-widest mb-2 font-medium">Risk Level</p>
          <h2 className="font-display text-6xl md:text-7xl font-800 mb-4" style={{ color: cfg.color }}>
            {cfg.label}
          </h2>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-muted" />
              <span className="text-muted">Model confidence:</span>
              <span className="font-mono font-600" style={{ color: cfg.color }}>{confidence}%</span>
            </div>
          </div>
        </div>
        {/* Confidence gauge */}
        <div className="hidden lg:flex flex-col items-center gap-3 flex-shrink-0">
          <div className="w-28 h-28 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%" innerRadius="60%" outerRadius="100%"
                data={[{ value: confidence, fill: cfg.color }]}
                startAngle={90} endAngle={90 - 360 * (confidence / 100)}
              >
                <RadialBar dataKey="value" cornerRadius={4} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-sm font-600" style={{ color: cfg.color }}>
                {confidence}%
              </span>
            </div>
          </div>
          <span className="text-xs text-muted">Confidence</span>
        </div>
      </div>
    </div>
  )
}

function ProbabilityPieChart({ probabilities }) {
  const data = Object.entries(probabilities).map(([name, val]) => ({
    name,
    value: Math.round(val * 100),
    color: name === 'High' ? '#EF4444' : name === 'Medium' ? '#F59E0B' : '#10B981',
  }))

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-600 mb-4 text-text">Risk Probability Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={55} outerRadius={90}
            paddingAngle={4} dataKey="value"
            label={({ name, value }) => `${name} ${value}%`}
            labelLine={false}
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#161D2E', border: '1px solid #1E293B', borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function TopFactorsChart({ factors }) {
  if (!factors.length) return null
  const data = factors.slice(0, 5).map(f => ({
    name: f.feature.length > 16 ? f.feature.slice(0, 16) + '…' : f.feature,
    impact: Math.round(f.impact * 1000) / 10,
  }))

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-600 mb-4 text-text">Top Risk Factors (Impact %)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" tick={{ fill: '#4B5563', fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#94A3B8', fontSize: 11 }} width={110} />
          <Tooltip
            contentStyle={{ background: '#161D2E', border: '1px solid #1E293B', borderRadius: 8 }}
            formatter={(v) => [`${v}%`, 'Impact']}
          />
          <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={`hsl(${190 - i * 18}, 80%, ${60 - i * 4}%)`} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function FactorsDetail({ factors }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-600 mb-4 text-text">Contributing Factors Detail</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {factors.map((f, i) => (
          <div key={i} className="bg-surface rounded-xl p-4 border border-border/50 hover:border-accent/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium text-text text-sm">{f.feature}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                f.direction === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {f.direction === 'high' ? '↑ High' : '↓ Low'}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-mono font-600 text-accent">{f.value}</p>
                <p className="text-xs text-muted mt-0.5">Threshold: {f.threshold}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Impact</p>
                <p className="text-sm font-mono text-warn">{(f.impact * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

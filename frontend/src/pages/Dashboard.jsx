import { useState } from 'react'
import HealthForm from '../components/HealthForm'
import { getInsights, predictRisk } from '../utils/api'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import { AlertTriangle, BarChart3 } from 'lucide-react'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161D2E', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 },
}

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [data,    setData]    = useState(null)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError(null)
    try {
      const [insights, risk] = await Promise.all([
        getInsights(formData),
        predictRisk(formData),
      ])
      setData({ insights, risk })
      setTimeout(() => document.getElementById('dash')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to connect to API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 section-enter">
      <div className="mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
          <BarChart3 size={14} />
          Interactive Visualizations
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-800 gradient-text">Health Dashboard</h1>
        <p className="text-muted text-lg max-w-3xl">Visualize your complete health profile with interactive charts, vitals tracking, and benchmark comparisons.</p>
      </div>

      <HealthForm onSubmit={handleSubmit} submitLabel="📊 Generate Dashboard" loading={loading} />

      {error && (
        <div className="mt-8 p-6 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {data && (
        <div id="dash" className="mt-16 space-y-8 section-enter">
          {/* Wellness Score Hero */}
          <WellnessHero insights={data.insights} risk={data.risk} />

          {/* Row 1: Radar + Bar Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WellnessRadar data={data.insights.radar_data} />
            <BenchmarkBar data={data.insights.bar_comparison} />
          </div>

          {/* Row 2: Vitals + Mood/Social/Productivity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VitalsPanel vitals={data.insights.vitals} />
            <ScoreGauges insights={data.insights} />
          </div>
        </div>
      )}
    </div>
  )
}

function WellnessHero({ insights, risk }) {
  const score = insights.wellness_score
  const color = score >= 70 ? '#10B981' : score >= 45 ? '#F59E0B' : '#EF4444'
  const riskColor = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' }[risk.risk_level] || '#22D3EE'

  return (
    <div className="glass rounded-2xl p-8 md:p-10 border border-border/50 overflow-hidden relative">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at bottom right, ${color}, transparent)` }} />
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Wellness Score */}
        <div className="lg:col-span-2 card-hover">
          <p className="text-muted text-xs uppercase tracking-widest mb-3 font-medium">Wellness Score</p>
          <div className="flex items-end gap-6">
            <div className="flex-1">
              <div className="text-7xl font-mono font-800 mb-3" style={{ color }}>{score}</div>
              <div className="space-y-2">
                <div className="h-3 bg-surface rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, background: color }} />
                </div>
                <p className="text-xs text-muted">{score >= 70 ? '✓ Excellent' : score >= 45 ? '⚠ Needs Improvement' : '✗ At Risk'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="card-hover">
          <p className="text-muted text-xs uppercase tracking-widest mb-3 font-medium">Risk Level</p>
          <p className="text-4xl font-display font-800 mb-2" style={{ color: riskColor }}>{risk.risk_level}</p>
          <p className="text-xs text-muted">{Math.round(risk.confidence * 100)}% confidence</p>
        </div>

        {/* Mood */}
        <div className="card-hover">
          <p className="text-muted text-xs uppercase tracking-widest mb-3 font-medium">Mood</p>
          <p className="text-4xl font-mono font-800 text-accent mb-1">{insights.mood}<span className="text-lg text-muted">/10</span></p>
          <div className="w-full h-1 bg-surface rounded-full">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${insights.mood * 10}%` }} />
          </div>
        </div>

        {/* Productivity */}
        <div className="card-hover">
          <p className="text-muted text-xs uppercase tracking-widest mb-3 font-medium">Productivity</p>
          <p className="text-4xl font-mono font-800 text-accent mb-1">{insights.productivity}<span className="text-lg text-muted">/10</span></p>
          <div className="w-full h-1 bg-surface rounded-full">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${insights.productivity * 10}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function WellnessRadar({ data }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-600 mb-4 text-text">Wellness Radar</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#1E293B" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#94A3B8', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#4B5563', fontSize: 9 }} />
          <Radar
            name="Score" dataKey="value"
            stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.15}
            strokeWidth={2}
          />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Score']} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function BenchmarkBar({ data }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-600 mb-4 text-text">Your Metrics vs Ideal</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="category" tick={{ fill: '#94A3B8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#4B5563', fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="yours" name="You"   radius={[4,4,0,0]} fill="#22D3EE" fillOpacity={0.8} />
          <Bar dataKey="ideal" name="Ideal" radius={[4,4,0,0]} fill="#10B981" fillOpacity={0.4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function VitalsPanel({ vitals }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-600 mb-4 text-text">Vital Signs</h3>
      <div className="space-y-4">
        {vitals.map((v, i) => {
          const pct = (() => {
            const ranges = {
              'Heart Rate': [40, 180], 'BP Systolic': [80, 180],
              'BP Diastolic': [50, 120], 'Respiration': [8, 35],
            }
            const [lo, hi] = ranges[v.name] || [0, 100]
            return Math.min(100, ((v.value - lo) / (hi - lo)) * 100)
          })()
          const color = v.status === 'normal' ? '#10B981' : '#F59E0B'
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-text">{v.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-600" style={{ color }}>
                    {v.value} {v.unit}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    v.status === 'normal' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {v.status}
                  </span>
                </div>
              </div>
              <div className="w-full bg-surface rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <p className="text-xs text-muted mt-0.5">Normal: {v.normal} {v.unit}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoreGauges({ insights }) {
  const items = [
    { label: 'Mood',         value: insights.mood,         max: 10, color: '#818CF8' },
    { label: 'Productivity', value: insights.productivity, max: 10, color: '#22D3EE' },
    { label: 'Social',       value: insights.social,       max: 10, color: '#10B981' },
  ]
  const radarVals = insights.radar_data.slice(0, 4)

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-600 mb-4 text-text">Wellbeing Scores</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {items.map(({ label, value, max, color }) => (
          <div key={label} className="text-center">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#1E293B" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={color} strokeWidth="2.5"
                  strokeDasharray={`${(value / max) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-base font-700" style={{ color }}>{value}</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-2">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {radarVals.map(({ metric, value }) => (
          <div key={metric}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">{metric}</span>
              <span className="font-mono text-accent">{value}%</span>
            </div>
            <div className="w-full bg-surface rounded-full h-1">
              <div
                className="h-1 rounded-full"
                style={{ width: `${value}%`, background: `linear-gradient(90deg, #22D3EE, #818CF8)` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

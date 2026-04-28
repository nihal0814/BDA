import { useState } from 'react'
import { FORM_FIELDS, DEFAULT_VALUES } from '../utils/formFields'
import { Send } from 'lucide-react'

export default function HealthForm({ onSubmit, loading = false, submitLabel = null }) {
  const [formData, setFormData] = useState(DEFAULT_VALUES)
  const [errors, setErrors] = useState({})

  const defaultLabel = 'Analyze Health Risk'
  const buttonLabel = submitLabel || defaultLabel

  const handleChange = (e) => {
    const { name, value, type } = e.target
    const newValue = type === 'number' ? parseFloat(value) : value
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))
    // Clear error when user starts editing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    Object.entries(formData).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        newErrors[key] = 'This field is required'
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const renderField = (field) => {
    const value = formData[field.name] ?? ''
    const hasError = errors[field.name]

    switch (field.type) {
      case 'number':
        return (
          <div key={field.name} className="flex flex-col">
            <label className="text-sm font-medium text-text mb-2 font-display">
              {field.label}
              {field.unit && <span className="text-xs text-muted ml-2">({field.unit})</span>}
            </label>
            <input
              type="number"
              name={field.name}
              value={value}
              onChange={handleChange}
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={field.placeholder}
              disabled={loading}
              className={`px-4 py-3 rounded-lg border transition-all duration-300 ${
                hasError
                  ? 'border-danger bg-danger/5 focus:border-danger focus:glow-danger'
                  : 'border-border hover:border-muted/50 focus:border-accent focus:glow-accent'
              } bg-surface/50 text-text placeholder-muted disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {hasError && <p className="text-danger text-xs mt-2 font-medium">⚠️ {hasError}</p>}
          </div>
        )

      case 'select':
        return (
          <div key={field.name} className="flex flex-col">
            <label className="text-sm font-medium text-text mb-2 font-display">
              {field.label}
            </label>
            <select
              name={field.name}
              value={value}
              onChange={handleChange}
              disabled={loading}
              className={`px-4 py-3 rounded-lg border transition-all duration-300 ${
                hasError
                  ? 'border-danger bg-danger/5 focus:border-danger'
                  : 'border-border hover:border-muted/50 focus:border-accent'
              } bg-surface/50 text-text disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Select {field.label}</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {hasError && <p className="text-danger text-xs mt-2 font-medium">⚠️ {hasError}</p>}
          </div>
        )

      case 'range':
        return (
          <div key={field.name} className="flex flex-col">
            <label className="text-sm font-medium text-text mb-3 font-display">
              {field.label}
              <span className="text-xs text-muted ml-2">
                Value: <span className="font-mono text-accent">{value}</span>
              </span>
            </label>
            <input
              type="range"
              name={field.name}
              value={value}
              onChange={handleChange}
              min={field.min}
              max={field.max}
              step={field.step}
              disabled={loading}
              className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-accent"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>{field.min}</span>
              <span>{field.max}</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-4xl mx-auto section-enter">
      {FORM_FIELDS.map(section => (
        <div key={section.section} className="glass rounded-2xl p-6 border border-border/50 space-y-4 card-hover">
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <span className="text-3xl">{section.icon}</span>
            <h3 className="font-display text-xl font-700 text-text">
              {section.section}
            </h3>
          </div>

          {/* Section Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {section.fields.map(field => renderField(field))}
          </div>
        </div>
      ))}

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className={`btn-primary relative group ${
            loading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-transparent border-t-bg rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Send size={18} />
              {buttonLabel}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

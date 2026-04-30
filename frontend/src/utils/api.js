import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export async function predictRisk(formData) {
  const { data } = await API.post('/predict-risk', formData)
  return data
}

export async function getRecommendations(formData) {
  const { data } = await API.post('/recommendations', formData)
  return data
}

export async function getInsights(formData) {
  const { data } = await API.post('/insights', formData)
  return data
}

export async function getModelMetrics() {
  const { data } = await API.get('/model-metrics')
  return data
}

export async function chat({ system, messages, max_tokens = 1000, temperature = 0.7, model } = {}) {
  const { data } = await API.post('/chat', {
    system,
    messages,
    max_tokens,
    temperature,
    model,
  })
  return data
}

// Backward-compatible exports (older imports)
export async function geminiChat(opts = {}) {
  return chat(opts)
}

export async function claudeChat(opts = {}) {
  return chat(opts)
}

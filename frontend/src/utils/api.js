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

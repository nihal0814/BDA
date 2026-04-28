import { useState, useRef, useEffect } from 'react'
import { Brain, Send, RefreshCw, Sparkles, User } from 'lucide-react'

const SYSTEM_PROMPT = `You are VitalIQ's AI Wellness Coach — an empathetic, knowledgeable health advisor specializing in stress management, lifestyle optimization, and preventive health. 

You help users understand their health risk data, interpret patterns in their vitals, lifestyle habits, and mental health. You provide:
- Clear explanations of health metrics and what they mean
- Practical, evidence-based wellness advice
- Motivational guidance tailored to the user's risk profile
- Answers to health questions grounded in science

Keep responses concise (2-4 paragraphs max), warm, and actionable. Never diagnose — always recommend consulting a healthcare professional for medical concerns. Use the user's health data if they share it to personalize advice.`

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}

const QUICK_PROMPTS = [
  "What does a High risk level mean for my health?",
  "How can I reduce stress naturally?",
  "Why is sleep so important for risk reduction?",
  "What are the best exercises for cardiovascular health?",
  "How does screen time affect my mental health?",
  "Explain my hydration impact on health risk",
]

export default function WellnessCoach() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Wellness Coach 👋 I can help you understand your health risk assessment, explain your vitals, or give you personalized wellness guidance.\n\nYou can ask me anything about your health data, or use one of the quick prompts below to get started!",
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: '⚠️ API key is not configured. Please set VITE_GEMINI_API_KEY in your .env.local file. Get your API key at https://aistudio.google.com/app/apikey'
      }])
      return
    }

    setInput('')
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: apiMessages,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error?.message || 'Gemini API request failed')

      const reply = data.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'Sorry, I could not generate a response.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `⚠️ Sorry, I couldn't connect right now. Please ensure the API is available.\n\nError: ${e.message}`
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: "Hello again! I'm ready to help you with any wellness questions. What would you like to know?"
    }])
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 section-enter h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center glow-accent">
            <Brain size={24} className="text-bg" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-800 gradient-text">AI Wellness Coach</h1>
            <p className="text-muted text-sm">Powered by Gemini · Health guidance & personalized wellness advice</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} />
          New Chat
        </button>
      </div>

      {/* Chat window */}
      <div className="flex-1 glass rounded-2xl border border-border/50 overflow-hidden flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 animate-in fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center
                ${msg.role === 'assistant'
                  ? 'bg-accent/10 border border-accent/30'
                  : 'bg-surface border border-border'
                }`}
              >
                {msg.role === 'assistant'
                  ? <Sparkles size={16} className="text-accent" />
                  : <User size={16} className="text-muted" />
                }
              </div>
              {/* Bubble */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'assistant'
                  ? 'bg-surface border border-border/50 text-text rounded-tl-sm'
                  : 'bg-accent/10 border border-accent/20 text-text rounded-tr-sm'
                }`}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: `<p>${formatMessage(msg.content)}</p>` }}
                  className="prose-sm [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:text-accent [&_strong]:font-600"
                />
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-accent" />
              </div>
              <div className="bg-surface border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="load-dot w-2 h-2 bg-accent rounded-full" />
                <div className="load-dot w-2 h-2 bg-accent rounded-full" />
                <div className="load-dot w-2 h-2 bg-accent rounded-full" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-6 py-3 border-t border-border/30 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border hover:border-accent/30 hover:text-accent text-muted transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t border-border/50 flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your health risk, vitals, stress management…"
            rows={1}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text
                       resize-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all
                       placeholder-muted outline-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-xl bg-accent/90 hover:bg-accent text-bg flex items-center justify-center
                       transition-all glow-accent disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

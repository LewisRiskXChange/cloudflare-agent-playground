import { useState, useEffect, useRef } from 'react'
import { useAgent } from 'agents/react'
import { useAgentChat } from '@cloudflare/ai-chat/react'
import MessageBubble from './MessageBubble'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminConfig {
  url: string
  apiKey: string
  agentName: string
}

interface Session {
  instanceName: string
  companyId: string
  vendorId: string
  startedAt: number
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const ADMIN_CONFIG_KEY = 'cf-nova-admin-config'

function loadAdminConfig(): AdminConfig | null {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_CONFIG_KEY) ?? 'null')
  } catch {
    return null
  }
}

function saveAdminConfig(config: AdminConfig) {
  localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config))
}

// ---------------------------------------------------------------------------
// Config form
// ---------------------------------------------------------------------------

function AdminConfigForm({ onSave }: { onSave: (c: AdminConfig) => void }) {
  const saved = loadAdminConfig()
  const [url, setUrl] = useState(saved?.url ?? 'https://')
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? '')
  const [agentName, setAgentName] = useState(saved?.agentName ?? 'NovaAgent')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      new URL(url)
      if (!apiKey.trim()) { setError('API key is required'); return }
      const config: AdminConfig = { url: url.replace(/\/$/, ''), apiKey, agentName }
      saveAdminConfig(config)
      onSave(config)
    } catch {
      setError('Enter a valid URL including https://')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin View</h1>
          <p className="text-sm text-gray-500 mt-1">Read-only access to all NOVA conversations</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Worker URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://nova-staging.example.workers.dev"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="RX_API_KEY"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Agent Class</label>
              <input
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="NovaAgent"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Open Admin View →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Read-only conversation viewer
// ---------------------------------------------------------------------------

function ConversationViewer({
  session,
  config,
  onBack,
}: {
  session: Session
  config: AdminConfig
  onBack: () => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const agent = useAgent({
    agent: config.agentName,
    name: session.instanceName,
    host: new URL(config.url).host,
  })

  const { messages, status } = useAgentChat({ agent })

  const isStreaming = status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Viewer header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="lg:hidden text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 font-mono">{session.instanceName}</span>
              <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2 py-0.5 font-medium flex-shrink-0">
                Read only
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Started {new Date(session.startedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <span className="text-xs text-gray-400">{messages.length} messages</span>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isStreaming ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {messages.length === 0 && status !== 'streaming' && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id ?? String(i)}
            message={msg}
            isAnimating={isStreaming && msg.role === 'assistant' && i === messages.length - 1}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Read-only footer */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Admin view — read only. New messages appear in real time.
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session list
// ---------------------------------------------------------------------------

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function SessionList({
  sessions,
  selectedId,
  onSelect,
  loading,
  error,
  onRefresh,
}: {
  sessions: Session[]
  selectedId: string | null
  onSelect: (s: Session) => void
  loading: boolean
  error: string | null
  onRefresh: () => void
}) {
  const [query, setQuery] = useState('')

  const filtered = sessions.filter(s =>
    !query ||
    s.companyId.toLowerCase().includes(query.toLowerCase()) ||
    s.vendorId.toLowerCase().includes(query.toLowerCase()) ||
    s.instanceName.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white">
      {/* Search header */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex-1">Sessions</h2>
          {loading
            ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            : (
              <button onClick={onRefresh} className="text-gray-400 hover:text-gray-600 transition-colors" title="Refresh">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )
          }
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search company or vendor ID…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">{query ? 'No matches found' : 'No sessions yet'}</p>
          </div>
        )}

        {filtered.map(session => (
          <button
            key={session.instanceName}
            onClick={() => onSelect(session)}
            className={`w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedId === session.instanceName ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 font-mono truncate">{session.instanceName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-gray-400">Co:</span>
                  <span className="text-xs text-gray-600 truncate">{session.companyId}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">Ve:</span>
                  <span className="text-xs text-gray-600 truncate">{session.vendorId}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(session.startedAt)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">
            {filtered.length} {filtered.length === 1 ? 'session' : 'sessions'}
            {query && ` matching "${query}"`}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main admin screen
// ---------------------------------------------------------------------------

interface Props {
  onSwitchToChat: () => void
}

export default function AdminScreen({ onSwitchToChat }: Props) {
  const [config, setConfig] = useState<AdminConfig | null>(loadAdminConfig)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Session | null>(null)

  async function fetchSessions(cfg: AdminConfig) {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${cfg.url}/nova/sessions`, {
        headers: { 'x-api-key': cfg.apiKey },
      })
      if (!res.ok) {
        setFetchError(res.status === 401 ? 'Invalid API key' : `Error ${res.status}`)
        return
      }
      const data = await res.json() as { sessions: Session[] }
      setSessions(data.sessions)
    } catch {
      setFetchError('Could not reach the Worker. Check the URL.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (config) fetchSessions(config)
  }, [config])

  if (!config) {
    return <AdminConfigForm onSave={cfg => { setConfig(cfg); fetchSessions(cfg) }} />
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">NOVA Admin</span>
          <span className="hidden sm:block text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
            {new URL(config.url).hostname}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToChat}
            className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md px-2.5 py-1 transition-colors"
          >
            Chat ↗
          </button>
          <button
            onClick={() => { setConfig(null); setSessions([]); setSelected(null) }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Reconfigure
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Session list — hidden on mobile when a session is selected */}
        <div className={`w-full lg:w-80 xl:w-96 flex-shrink-0 ${selected ? 'hidden lg:flex' : 'flex'} flex-col`}>
          <SessionList
            sessions={sessions}
            selectedId={selected?.instanceName ?? null}
            onSelect={setSelected}
            loading={loading}
            error={fetchError}
            onRefresh={() => fetchSessions(config)}
          />
        </div>

        {/* Conversation viewer */}
        <div className={`flex-1 ${!selected ? 'hidden lg:flex' : 'flex'} flex-col`}>
          {selected ? (
            <ConversationViewer
              key={selected.instanceName}
              session={selected}
              config={config}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Select a session</p>
              <p className="text-xs text-gray-400 mt-1">Choose a conversation from the list to view it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

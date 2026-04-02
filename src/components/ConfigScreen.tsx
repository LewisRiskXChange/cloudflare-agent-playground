import { useState } from 'react'

export type AutonomyMode = 'manual' | 'assisted' | 'autonomous'

export interface AgentConfig {
  url: string
  agentName: string
  companyId: string
  vendorId: string
  apiKey: string
  autonomyMode: AutonomyMode
}

export function sessionId(config: Pick<AgentConfig, 'companyId' | 'vendorId'>): string {
  return `${config.companyId}:${config.vendorId}`
}

const STORAGE_KEY = 'cf-agent-playground-config'
const ADMIN_CONFIG_KEY = 'cf-nova-admin-config'

function loadConfig(): AgentConfig | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

function loadAdminApiKey(): string {
  try {
    const admin = JSON.parse(localStorage.getItem(ADMIN_CONFIG_KEY) ?? 'null')
    return admin?.apiKey ?? ''
  } catch {
    return ''
  }
}

interface Props {
  onConnect: (config: AgentConfig) => void
  connecting?: boolean
  connectError?: string
}

const AUTONOMY_OPTIONS: { value: AutonomyMode; label: string; description: string }[] = [
  { value: 'manual',     label: 'Manual',     description: 'Nova monitors only — no automated actions' },
  { value: 'assisted',   label: 'Assisted',   description: 'AI drafts emails, human approves each step' },
  { value: 'autonomous', label: 'Autonomous', description: 'AI acts fully automatically (reserved)' },
]

export default function ConfigScreen({ onConnect, connecting = false, connectError = '' }: Props) {
  const saved = loadConfig()
  const [url, setUrl] = useState(saved?.url ?? 'https://')
  const [agentName, setAgentName] = useState(saved?.agentName ?? 'NovaAgent')
  const [companyId, setCompanyId] = useState(saved?.companyId ?? '')
  const [vendorId, setVendorId] = useState(saved?.vendorId ?? '')
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? loadAdminApiKey())
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>(saved?.autonomyMode ?? 'assisted')
  const [localError, setLocalError] = useState('')

  const displayError = connectError || localError

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')
    try {
      new URL(url)
      const config: AgentConfig = {
        url: url.replace(/\/$/, ''),
        agentName,
        companyId: companyId.trim(),
        vendorId: vendorId.trim(),
        apiKey: apiKey.trim(),
        autonomyMode,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      onConnect(config)
    } catch {
      setLocalError('Enter a valid URL including https://')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Playground</h1>
          <p className="text-sm text-gray-500 mt-1">Connect to any Cloudflare AIChatAgent</p>
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company ID</label>
                <input
                  type="text"
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  placeholder="uuid"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor ID</label>
                <input
                  type="text"
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                  placeholder="uuid"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Autonomy Mode</label>
              <div className="space-y-2">
                {AUTONOMY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAutonomyMode(opt.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      autonomyMode === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className={`block text-xs mt-0.5 ${autonomyMode === opt.value ? 'text-blue-600' : 'text-gray-400'}`}>
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Calls <span className="font-mono">POST /nova/start</span> with the selected mode, then opens the WebSocket — replicating the platform flow.
            </p>

            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-sm text-red-600">{displayError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={connecting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {connecting ? 'Starting agent…' : 'Connect →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

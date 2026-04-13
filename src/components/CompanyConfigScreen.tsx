import { useState } from 'react'

export interface CompanyAgentConfig {
  url: string
  companyId: string
  apiKey: string
}

const STORAGE_KEY = 'cf-playground-company-config'

function loadConfig(): CompanyAgentConfig | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

interface Props {
  onConnect: (config: CompanyAgentConfig) => void
}

export default function CompanyConfigScreen({ onConnect }: Props) {
  const saved = loadConfig()
  const [url, setUrl] = useState(saved?.url ?? 'http://localhost:8787')
  const [companyId, setCompanyId] = useState(saved?.companyId ?? '')
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? '')
  const [localError, setLocalError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')
    try {
      new URL(url)
      const config: CompanyAgentConfig = {
        url: url.replace(/\/$/, ''),
        companyId: companyId.trim(),
        apiKey: apiKey.trim(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      onConnect(config)
    } catch {
      setLocalError('Enter a valid URL including https://')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md my-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Company Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Connect to the NovaCompanyAgent</p>
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company ID</label>
              <input
                type="text"
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
                placeholder="13"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                required
              />
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Connects directly to <span className="font-mono">nova-company-agent/{companyId || 'companyId'}</span> — no workflow start required.
            </p>

            {localError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-sm text-red-600">{localError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 active:bg-violet-800 transition-colors"
            >
              Connect →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

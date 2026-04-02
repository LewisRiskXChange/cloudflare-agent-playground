import { useState } from 'react'
import ConfigScreen, { type AgentConfig } from './components/ConfigScreen'
import ChatScreen from './components/ChatScreen'
import AdminScreen from './components/AdminScreen'

type Mode = 'chat' | 'admin'

const MODE_KEY = 'cf-playground-mode'

export default function App() {
  const [mode, setMode] = useState<Mode>(() =>
    (localStorage.getItem(MODE_KEY) as Mode) ?? 'chat'
  )
  const [chatConfig, setChatConfig] = useState<AgentConfig | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')

  function switchMode(m: Mode) {
    setMode(m)
    localStorage.setItem(MODE_KEY, m)
    if (m === 'chat') setChatConfig(null)
  }

  async function handleConnect(config: AgentConfig) {
    setConnecting(true)
    setConnectError('')
    try {
      const res = await fetch(`${config.url}/nova/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify({ companyId: config.companyId, vendorId: config.vendorId, autonomyMode: config.autonomyMode }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setConnectError(
          res.status === 401
            ? 'Invalid API key — check RX_API_KEY'
            : res.status === 422
            ? 'Invalid companyId or vendorId format'
            : `POST /nova/start failed (${res.status})${text ? `: ${text}` : ''}`
        )
        return
      }
      setChatConfig(config)
    } catch {
      setConnectError('Could not reach the Worker — check the URL and that it is deployed')
    } finally {
      setConnecting(false)
    }
  }

  if (mode === 'admin') {
    return <AdminScreen onSwitchToChat={() => switchMode('chat')} />
  }

  if (chatConfig) {
    return <ChatScreen {...chatConfig} onDisconnect={() => setChatConfig(null)} />
  }

  return (
    <div className="relative">
      <ConfigScreen
        onConnect={handleConnect}
        connecting={connecting}
        connectError={connectError}
      />
      <button
        onClick={() => switchMode('admin')}
        className="fixed bottom-4 right-4 text-xs text-gray-500 bg-white border border-gray-200 shadow-sm rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        Admin view →
      </button>
    </div>
  )
}

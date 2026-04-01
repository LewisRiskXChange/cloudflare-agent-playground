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

  function switchMode(m: Mode) {
    setMode(m)
    localStorage.setItem(MODE_KEY, m)
    if (m === 'chat') setChatConfig(null)
  }

  if (mode === 'admin') {
    return <AdminScreen onSwitchToChat={() => switchMode('chat')} />
  }

  // Chat mode — show mode switcher only on the config screen, not mid-chat
  if (chatConfig) {
    return <ChatScreen {...chatConfig} onDisconnect={() => setChatConfig(null)} />
  }

  return (
    <div className="relative">
      <ConfigScreen onConnect={setChatConfig} />
      {/* Mode switcher */}
      <button
        onClick={() => switchMode('admin')}
        className="fixed bottom-4 right-4 text-xs text-gray-500 bg-white border border-gray-200 shadow-sm rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        Admin view →
      </button>
    </div>
  )
}

import { useState } from 'react'
import ConfigScreen, { type AgentConfig } from './components/ConfigScreen'
import ChatScreen from './components/ChatScreen'

export default function App() {
  const [config, setConfig] = useState<AgentConfig | null>(null)

  return config
    ? <ChatScreen {...config} onDisconnect={() => setConfig(null)} />
    : <ConfigScreen onConnect={setConfig} />
}

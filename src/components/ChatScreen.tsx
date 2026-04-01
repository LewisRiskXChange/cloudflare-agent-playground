import { useCallback, useEffect, useRef, useState } from 'react'
import { useAgent } from 'agents/react'
import { useAgentChat } from '@cloudflare/ai-chat/react'
import type { AgentConfig } from './ConfigScreen'
import { sessionId as makeSessionId } from './ConfigScreen'
import MessageBubble from './MessageBubble'

interface Props extends AgentConfig {
  onDisconnect: () => void
}

export default function ChatScreen({ url, agentName, companyId, vendorId, onDisconnect }: Props) {
  const sessionId = makeSessionId({ companyId, vendorId })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const agent = useAgent({
    agent: agentName,
    name: sessionId,
    host: new URL(url).host,
  })

  const { messages, sendMessage, clearHistory, status } = useAgentChat({ agent })

  const isLoading = status === 'submitted' || status === 'streaming'
  const isStreaming = status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = useCallback(() => {
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage({ role: 'user', parts: [{ type: 'text', text }] })
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [input, isLoading, sendMessage])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{agentName}</span>
          <span className="text-gray-300 flex-shrink-0">/</span>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs text-gray-400 flex-shrink-0">co:</span>
            <span className="text-sm text-gray-500 font-mono truncate">{companyId}</span>
            <span className="text-gray-300 flex-shrink-0 hidden sm:block">·</span>
            <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">ve:</span>
            <span className="text-sm text-gray-500 font-mono truncate hidden sm:block">{vendorId}</span>
          </div>
          <span className="hidden lg:block text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono flex-shrink-0">
            {new URL(url).hostname}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <button
            onClick={clearHistory}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors hidden sm:block"
          >
            Clear history
          </button>
          <button
            onClick={onDisconnect}
            className="text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-md px-2.5 py-1"
          >
            Change config
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">Start a conversation</p>
            <p className="text-xs text-gray-400 mt-1">Type a message below to chat with {agentName}</p>
            <p className="text-xs text-gray-300 mt-0.5 font-mono">{sessionId}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id ?? String(i)}
            message={msg}
            isAnimating={isStreaming && msg.role === 'assistant' && i === messages.length - 1}
          />
        ))}

        {status === 'submitted' && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agentName}… (Enter to send, Shift+Enter for newline)`}
            rows={1}
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-50 transition-colors"
            style={{ minHeight: '42px', maxHeight: '160px', fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={submit}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 h-[42px] bg-blue-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

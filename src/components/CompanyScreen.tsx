import { useCallback, useEffect, useRef, useState } from 'react'
import { useAgent } from 'agents/react'
import { useAgentChat } from '@cloudflare/ai-chat/react'
import type { CompanyAgentConfig } from './CompanyConfigScreen'
import MessageBubble from './MessageBubble'

interface Props extends CompanyAgentConfig {
  onDisconnect: () => void
}

export default function CompanyScreen({ url, companyId, onDisconnect }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const agent = useAgent({
    agent: 'nova-company-agent',
    name: companyId,
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
          <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 flex-shrink-0">NovaCompanyAgent</span>
          <span className="text-gray-300 flex-shrink-0">/</span>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs text-gray-400 flex-shrink-0">co:</span>
            <span className="text-sm text-gray-500 font-mono truncate">{companyId}</span>
          </div>
          <span className="hidden lg:block text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono flex-shrink-0">
            {new URL(url).hostname}
          </span>
          <span className="text-xs bg-violet-50 border border-violet-200 text-violet-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
            company admin
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

      {/* Chat column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Company Admin Chat</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Ask about vendor statuses, pending approvals, or fix a vendor contact
              </p>
              <div className="mt-4 space-y-2 text-left w-full max-w-xs">
                {[
                  'List all my vendors',
                  'What approvals are pending?',
                  'What\'s the status of vendor 11?',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      sendMessage({ role: 'user', parts: [{ type: 'text', text: suggestion }] })
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-violet-300 hover:text-violet-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
              placeholder="Ask about vendors, approvals, or fix a contact… (Enter to send)"
              rows={1}
              disabled={isLoading}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-50 transition-colors"
              style={{ minHeight: '42px', maxHeight: '160px', fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              onClick={submit}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 h-[42px] bg-violet-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

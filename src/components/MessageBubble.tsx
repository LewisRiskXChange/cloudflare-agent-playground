import type { UIMessage } from 'ai'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'

interface Props {
  message: UIMessage
  isAnimating: boolean
}

export default function MessageBubble({ message, isAnimating }: Props) {
  const isUser = message.role === 'user'
  const text = message.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map(p => p.text)
    .join('')

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%] bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="prose prose-sm max-w-none text-gray-800">
          <Streamdown plugins={{ code }} isAnimating={isAnimating}>
            {text}
          </Streamdown>
        </div>
      </div>
    </div>
  )
}

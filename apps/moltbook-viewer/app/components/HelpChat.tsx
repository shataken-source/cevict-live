'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useState } from 'react'

export default function HelpChat() {
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => setAvailable(d.available === true))
      .catch(() => setAvailable(false))
  }, [])

  const { messages, sendMessage, status, error } = useChat({
    id: 'moltbook-viewer-help',
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.querySelector('input[name="help-input"]') as HTMLInputElement
    const text = input?.value?.trim()
    if (text) {
      sendMessage({ text })
      input.value = ''
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-lg hover:bg-emerald-500/30"
        title="Help"
        aria-label="Help"
      >
        <span className="text-lg font-semibold">?</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:left-auto sm:h-[420px] sm:w-[380px] sm:rounded-xl sm:shadow-2xl"
          aria-modal
          role="dialog"
        >
          <div className="flex h-full flex-col rounded-xl border border-emerald-500/30 bg-gray-900 shadow-xl sm:max-h-[420px]">
            <div className="flex items-center justify-between border-b border-emerald-500/20 px-4 py-3">
              <h2 className="font-mono text-sm font-semibold text-emerald-400">
                Moltbook Viewer help
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {available === false && (
                <p className="text-sm text-amber-400/90">
                  Add <code className="rounded bg-gray-800 px-1">OPENAI_API_KEY</code> to{' '}
                  <code className="rounded bg-gray-800 px-1">.env.local</code> and restart to use
                  the help assistant.
                </p>
              )}
              {available === true && (
                <>
                  {messages.length === 0 && (
                    <p className="mb-3 text-sm text-gray-500">
                      Ask about setup, config, Agent TODO, Brief, or first time on Moltbook.
                    </p>
                  )}
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.role === 'user'
                            ? 'ml-4 text-right text-sm text-gray-200'
                            : 'mr-4 rounded-lg border border-emerald-500/20 bg-black/40 p-3 text-sm text-gray-300'
                        }
                      >
                        {message.parts?.map((part: { type: string; text?: string }, i: number) => {
                          if (part.type === 'text' && part.text) {
                            return (
                              <div
                                key={`${message.id}-${i}`}
                                className="whitespace-pre-wrap"
                              >
                                {part.text}
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    ))}
                    {status === 'streaming' && (
                      <div className="mr-4 rounded-lg border border-emerald-500/20 bg-black/40 p-3 text-sm text-gray-500">
                        …
                      </div>
                    )}
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-400">{error.message}</p>
                  )}
                </>
              )}
            </div>

            {available === true && (
              <form
                onSubmit={handleSubmit}
                className="border-t border-emerald-500/20 p-3"
              >
                <div className="flex gap-2">
                  <input
                    name="help-input"
                    type="text"
                    placeholder="Ask about the viewer…"
                    className="min-w-0 flex-1 rounded border border-gray-600 bg-black/40 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                    disabled={status === 'streaming'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'streaming'}
                    className="rounded bg-emerald-500/30 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/40 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

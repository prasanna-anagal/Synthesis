import { useCallback, useRef } from 'react'

export function useSSE() {
  const abortRef = useRef(null)

  const startStream = useCallback(async (response, onEvent, onDone, onError) => {
    abortRef.current = new AbortController()
    try {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = 'message'
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim()
            try {
              const parsed = JSON.parse(rawData)
              onEvent({ event: currentEvent, data: parsed })
              if (currentEvent === 'done') onDone?.()
            } catch {
              // non-JSON, skip
            }
            currentEvent = 'message'
          }
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') onError?.(err)
    }
  }, [])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  return { startStream, stop }
}

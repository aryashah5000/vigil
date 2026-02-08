import React, { useState, useRef, useCallback } from 'react'
import { Volume2, Loader2, Pause } from 'lucide-react'

const API = '/api'

export default function AudioPlayer({ text, className = '' }) {
  const [state, setState] = useState('idle') // idle | loading | playing | error
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)

  const handleClick = useCallback(async () => {
    // If playing, pause
    if (state === 'playing' && audioRef.current) {
      audioRef.current.pause()
      setState('idle')
      return
    }

    // If we already have cached audio, replay it
    if (blobUrlRef.current) {
      const audio = audioRef.current || new Audio()
      audioRef.current = audio
      audio.src = blobUrlRef.current
      audio.onended = () => setState('idle')
      audio.play()
      setState('playing')
      return
    }

    // Fetch TTS from backend
    setState('loading')
    try {
      const res = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        throw new Error(`TTS failed: ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setState('idle')
      audio.play()
      setState('playing')
    } catch (e) {
      console.warn('TTS error:', e)
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }, [text, state])

  const icon = {
    idle: <Volume2 className="w-3.5 h-3.5" />,
    loading: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    playing: <Pause className="w-3.5 h-3.5" />,
    error: <Volume2 className="w-3.5 h-3.5" />,
  }[state]

  const label = {
    idle: 'Listen',
    loading: 'Generating...',
    playing: 'Pause',
    error: 'Unavailable',
  }[state]

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        state === 'playing'
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : state === 'error'
            ? 'bg-signal-red/10 text-signal-red/60 border border-signal-red/20'
            : 'bg-hull-700 text-gray-300 hover:text-white border border-hull-600/50 hover:border-amber-500/30'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
      {label}
    </button>
  )
}

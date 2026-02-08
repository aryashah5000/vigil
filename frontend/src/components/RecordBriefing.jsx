import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Send, Loader2, FileText, User, Tag } from 'lucide-react'

const API = '/api'

export default function RecordBriefing({ onCreated }) {
  const [rawText, setRawText] = useState('')
  const [author, setAuthor] = useState('')
  const [shiftLabel, setShiftLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef(null)

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setRawText(prev => {

        const base = prev.endsWith(' ') ? prev : prev + ' '
        return transcript
      })
    }

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e)
      setIsRecording(false)
    }

    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const handleSubmit = async () => {
    if (!rawText.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch(`${API}/briefings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: rawText.trim(),
          author: author.trim() || undefined,
          shift_label: shiftLabel.trim() || undefined,
        }),
      })
      const data = await res.json()
      onCreated({ id: data.id, structured: data.structured, raw_text: rawText, author, shift_label: shiftLabel, created_at: new Date().toISOString() })
    } catch (e) {
      console.error('Failed to submit briefing:', e)
      alert('Failed to submit. Is the backend running on port 8000?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-mono font-bold text-white tracking-tight">
          Record Shift Briefing
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Speak or type your end-of-shift handoff. AI will structure it into actionable items.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-hull-900 rounded-xl border border-hull-600/40 overflow-hidden"
      >
        {}
        <div className="px-6 py-4 border-b border-hull-600/30 flex gap-4">
          <div className="flex-1">
            <label className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-1.5">
              <User className="w-3 h-3" /> Author
            </label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Your name"
              className="w-full bg-hull-800 border border-hull-600/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/40 transition"
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-1.5">
              <Tag className="w-3 h-3" /> Shift Label
            </label>
            <input
              type="text"
              value={shiftLabel}
              onChange={e => setShiftLabel(e.target.value)}
              placeholder="e.g. Night → Day"
              className="w-full bg-hull-800 border border-hull-600/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/40 transition"
            />
          </div>
        </div>

        {}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <FileText className="w-3 h-3" /> Briefing Content
            </label>
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isRecording
                  ? 'bg-signal-red/20 text-signal-red border border-signal-red/30 attention-ring'
                  : 'bg-hull-700 text-gray-300 hover:text-white border border-hull-600/50 hover:border-amber-500/30'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isRecording ? 'Stop Recording' : 'Voice Input'}
            </button>
          </div>

          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-signal-red/5 border border-signal-red/20"
            >
              <div className="w-2 h-2 rounded-full bg-signal-red animate-pulse" />
              <span className="text-xs text-signal-red font-mono">Recording — speak your shift briefing</span>
            </motion.div>
          )}

          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={10}
            placeholder="Start speaking or type your shift briefing here...&#10;&#10;Example: Line 3 conveyor has been making a grinding noise since 2 PM. Machine 7 bearing temp spiked to 185°F. We hit 94% of target on Line 1, missed because of a 20-minute packaging jam. There's an oil slick near the south exit by Machine 12..."
            className="w-full bg-hull-800/50 border border-hull-600/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 leading-relaxed resize-none focus:outline-none focus:border-amber-500/30 transition font-body"
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs font-mono text-gray-600">
              {rawText.length} characters · ~{rawText.split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              onClick={handleSubmit}
              disabled={!rawText.trim() || submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-hull-950 font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit & Structure
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {}
      <div className="mt-6 bg-hull-900/50 rounded-xl border border-hull-600/20 px-6 py-4">
        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Tips for a great briefing</p>
        <ul className="space-y-1.5 text-xs text-gray-400">
          <li>• Mention specific machine IDs and locations</li>
          <li>• Flag safety hazards with explicit warnings</li>
          <li>• Include numbers — temperatures, rates, percentages</li>
          <li>• State what the next shift needs to <em>do</em>, not just what happened</li>
        </ul>
      </div>
    </div>
  )
}
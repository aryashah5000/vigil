import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Camera, ChevronRight, ChevronLeft,
  AlertTriangle, Shield, Wrench, BarChart3, Activity, Clock,
  CheckCircle2, XCircle, RotateCcw, Video, Play, Zap
} from 'lucide-react'
import { useAttention } from '../hooks/useAttention'
import AudioPlayer from './AudioPlayer'

const API = '/api'

const SEVERITY_CONFIG = {
  critical: { color: 'text-signal-red', bg: 'bg-signal-red/10', border: 'border-signal-red/30', barColor: '#ef4444' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', barColor: '#f59e0b' },
  info: { color: 'text-signal-blue', bg: 'bg-signal-blue/10', border: 'border-signal-blue/30', barColor: '#3b82f6' },
}

const CATEGORY_ICONS = {
  safety: Shield,
  maintenance: Wrench,
  production: BarChart3,
  quality: Activity,
  general: Clock,
}

function EngagementGauge({ value, label, color }) {
  const percentage = Math.round(value * 100)
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (value * circumference)

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#1a2332" strokeWidth="4" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold" style={{ color }}>
            {percentage}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

function AttentionBar({ engagement, focus }) {
  const getColor = (val) => {
    if (val >= 0.7) return '#22c55e'
    if (val >= 0.4) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Eye className="w-3 h-3 text-gray-500" />
        <div className="w-16 h-1.5 bg-hull-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${engagement * 100}%`, backgroundColor: getColor(engagement) }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-gray-500" />
        <div className="w-16 h-1.5 bg-hull-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${focus * 100}%`, backgroundColor: getColor(focus) }}
          />
        </div>
      </div>
    </div>
  )
}

export default function ReviewBriefing({ briefing }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('setup') // setup | reviewing | results
  const [itemResults, setItemResults] = useState([])
  const [missedItems, setMissedItems] = useState([])
  const [reviewQueue, setReviewQueue] = useState(null) // null = all items, array = specific indices to review
  const [isReReview, setIsReReview] = useState(false)
  const videoRef = useRef(null)
  const recordingInterval = useRef(null)
  const cameraStreamRef = useRef(null)
  const sessionInitRef = useRef(false)

  const itemResultsRef = useRef([])
  useEffect(() => { itemResultsRef.current = itemResults }, [itemResults])

  const attention = useAttention()

  const items = briefing?.structured?.items || []

  const activeQueue = reviewQueue || items.map((_, i) => i)
  const activeItemIndex = activeQueue[currentIndex] // maps local index to actual item index

  useEffect(() => {
    if (phase !== 'reviewing' || activeItemIndex == null) return

    recordingInterval.current = setInterval(() => {
      attention.recordReading(activeItemIndex)
    }, 500)

    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current)
    }
  }, [phase, activeItemIndex, attention])

  useEffect(() => {
    if (phase === 'reviewing' && activeItemIndex != null) {
      attention.startTrackingItem(activeItemIndex)
    }
  }, [activeItemIndex, phase, attention])

  useEffect(() => {
    if (phase !== 'reviewing' || !videoRef.current) return
    if (sessionInitRef.current) return
    sessionInitRef.current = true

    const attachCamera = async () => {
      if (cameraStreamRef.current && videoRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current
        try {
          await videoRef.current.play()
        } catch (e) {
          console.warn('Video play failed:', e)
        }
      }
      await attention.startSession(videoRef.current)
      if (activeQueue[0] != null) {
        attention.startTrackingItem(activeQueue[0])
      }
    }
    attachCamera()
  }, [phase])

  const acquireCamera = async () => {

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
    }
    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true })
    } catch (e) {
      console.warn('Camera not available, using demo mode')
    }
  }

  const startReview = async () => {
    await acquireCamera()
    sessionInitRef.current = false
    setPhase('reviewing')
  }

  const advanceItem = () => {
    const result = attention.stopTrackingItem(activeItemIndex)
    if (result) {
      setItemResults(prev => [...prev, result])
    }

    if (currentIndex < activeQueue.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {

      const allResults = result
        ? [...itemResultsRef.current, result]
        : [...itemResultsRef.current]
      finishReview(allResults)
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      attention.stopTrackingItem(activeItemIndex)
      setCurrentIndex(currentIndex - 1)
    }
  }

  const finishReview = async (finalResults) => {
    await attention.stopSession()
    sessionInitRef.current = false

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null
    }

    if (isReReview) {

      setItemResults(prev => {
        const updated = [...prev]
        for (const result of finalResults) {
          const existingIdx = updated.findIndex(r => r.itemIndex === result.itemIndex)
          if (existingIdx >= 0) {
            updated[existingIdx] = result
          } else {
            updated.push(result)
          }
        }
        return updated
      })

      const stillMissed = finalResults.filter(
        r => r.avgEngagement < 0.4 || r.avgFocus < 0.35
      )
      setMissedItems(stillMissed)
    } else {

      setItemResults(finalResults)

      const missed = finalResults.filter(
        r => r.avgEngagement < 0.4 || r.avgFocus < 0.35
      )
      setMissedItems(missed)
    }

    setReviewQueue(null)
    setIsReReview(false)
    setPhase('results')

    try {
      await fetch(`${API}/briefings/${briefing.id}/attention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: finalResults.map(r => ({
            item_index: r.itemIndex,
            avg_engagement: r.avgEngagement,
            avg_focus: r.avgFocus,
            time_spent_ms: r.timeSpentMs,
          })),
        }),
      })
    } catch (e) {
      console.warn('Failed to log attention data:', e)
    }
  }

  const resetReview = () => {
    setPhase('setup')
    setCurrentIndex(0)
    setItemResults([])
    setMissedItems([])
    setReviewQueue(null)
    setIsReReview(false)
    sessionInitRef.current = false
  }

  const startReReview = async () => {
    const missedIndices = missedItems.map(m => m.itemIndex)

    setCurrentIndex(0)
    setReviewQueue(missedIndices)
    setIsReReview(true)

    await acquireCamera()
    sessionInitRef.current = false
    setPhase('reviewing')
  }

  if (!briefing) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Eye className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Select a briefing from the dashboard to review</p>
        </div>
      </div>
    )
  }

  if (phase === 'setup') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-mono font-bold text-white tracking-tight">
            Review Briefing
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Walk through each item while your camera tracks attention in real-time
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-hull-900 rounded-xl border border-hull-600/40 overflow-hidden"
        >
          {}
          <div className="px-6 py-4 border-b border-hull-600/30">
            <p className="text-sm font-medium text-white">
              {briefing.shift_label || 'Shift Handoff'}
            </p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {items.length} items · {briefing.author || 'Unknown'} · {new Date(briefing.created_at).toLocaleString()}
            </p>
          </div>

          {briefing.structured?.summary && (
            <div className="px-6 py-3 border-b border-hull-600/20 bg-hull-800/30 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-300 leading-relaxed flex-1">
                {briefing.structured.summary}
              </p>
              <AudioPlayer text={briefing.structured.summary} className="shrink-0 mt-0.5" />
            </div>
          )}

          {}
          <div className="px-6 py-6">
            <h3 className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-4">
              How Attention-Tracked Review Works
            </h3>
            <div className="space-y-3">
              {[
                { icon: Camera, text: 'Your camera monitors engagement via face tracking' },
                { icon: Eye, text: 'Each briefing item is shown one at a time while tracking focus' },
                { icon: AlertTriangle, text: 'Items where your attention dropped are flagged and resurfaced' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-hull-700 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-sm text-gray-300">{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={startReview}
              className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-500 text-hull-950 font-semibold text-sm hover:bg-amber-400 transition"
            >
              <Play className="w-4 h-4" />
              Start Attention-Tracked Review
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase === 'reviewing') {
    const item = items[activeItemIndex]
    if (!item) {

      return (
        <div className="p-8 text-center">
          <p className="text-gray-400">No items to review.</p>
          <button onClick={resetReview} className="mt-4 text-amber-400 text-sm hover:text-amber-300">
            Reset
          </button>
        </div>
      )
    }
    const sev = SEVERITY_CONFIG[item?.severity] || SEVERITY_CONFIG.info
    const CatIcon = CATEGORY_ICONS[item?.category] || Clock
    const progress = ((currentIndex + 1) / activeQueue.length) * 100

    return (
      <div className="p-8 max-w-4xl mx-auto">
        {}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {isReReview && (
              <span className="text-[10px] font-mono text-signal-red bg-signal-red/10 px-2 py-0.5 rounded mr-2">
                RE-REVIEW
              </span>
            )}
            <span className="text-xs font-mono text-gray-500">
              Item {currentIndex + 1} of {activeQueue.length}
            </span>
            <div className="w-48 h-1.5 bg-hull-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {}
          <div className="flex items-center gap-4">
            <AttentionBar
              engagement={attention.liveMetrics.engagement}
              focus={attention.liveMetrics.focus}
            />
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono ${
              attention.liveMetrics.faceDetected
                ? 'text-signal-green bg-signal-green/10'
                : 'text-signal-red bg-signal-red/10'
            }`}>
              <Video className="w-3 h-3" />
              {attention.liveMetrics.faceDetected ? 'TRACKING' : 'NO FACE'}
            </div>
            {attention.isDemo && (
              <span className="text-[10px] font-mono text-gray-600 bg-hull-700 px-2 py-1 rounded">
                DEMO MODE
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${isReReview ? 're' : ''}${activeItemIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className={`bg-hull-900 rounded-xl border overflow-hidden ${
                  item.severity === 'critical' ? 'border-signal-red/30 glow-red' :
                  item.severity === 'warning' ? 'border-amber-500/30 glow-amber' :
                  'border-hull-600/40'
                }`}
              >
                {}
                {isReReview && (
                  <div className="px-5 py-2 border-b border-signal-red/20 bg-signal-red/5 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-signal-red" />
                    <span className="text-[10px] font-mono text-signal-red">
                      FLAGGED — PREVIOUSLY LOW ATTENTION
                    </span>
                  </div>
                )}

                {}
                <div className="px-6 py-4 border-b border-hull-600/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${sev.bg} flex items-center justify-center`}>
                      <CatIcon className={`w-4 h-4 ${sev.color}`} />
                    </div>
                    <div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${sev.color}`}>
                        {item.category} · {item.severity}
                      </span>
                      <p className="text-xs font-mono text-gray-500">{item.machine_id}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-md ${sev.bg} ${sev.color} border ${sev.border}`}>

                  </span>
                </div>

                {}
                <div className="px-6 py-6">
                  <h3 className="text-lg font-semibold text-white mb-3 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">
                    {item.details}
                  </p>

                  {item.action_required && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
                      <p className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-1">
                        Action Required
                      </p>
                      <p className="text-sm text-amber-200/90">
                        {item.action_required}
                      </p>
                    </div>
                  )}

                  {item.entities?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {item.entities.map((ent, ei) => {
                        const styles = {
                          machine: 'bg-signal-blue/10 text-signal-blue border-signal-blue/20',
                          part: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          failure_mode: 'bg-signal-red/10 text-signal-red border-signal-red/20',
                        }
                        return (
                          <span key={ei} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${styles[ent.type] || styles.machine}`}>
                            {ent.type === 'machine' ? '⚙' : ent.type === 'part' ? '🔧' : '⚠'} {ent.text}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {}
                <div className="px-6 py-4 border-t border-hull-600/30 flex items-center justify-between">
                  <button
                    onClick={goBack}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={advanceItem}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-hull-950 font-semibold text-sm hover:bg-amber-400 transition"
                  >
                    {currentIndex < activeQueue.length - 1 ? (
                      <>Next Item <ChevronRight className="w-4 h-4" /></>
                    ) : (
                      <>Finish Review <CheckCircle2 className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {}
          <div className="w-64 shrink-0 space-y-4">
            {}
            <div className="bg-hull-900 rounded-xl border border-hull-600/40 overflow-hidden">
              <div className="px-4 py-2 border-b border-hull-600/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-signal-red animate-pulse" />
                <span className="text-[10px] font-mono text-gray-400">ATTENTION FEED</span>
              </div>
              <div className="aspect-[4/3] bg-hull-800 relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {!attention.liveMetrics.faceDetected && (
                  <div className="absolute inset-0 bg-hull-900/80 flex items-center justify-center">
                    <EyeOff className="w-6 h-6 text-gray-600" />
                  </div>
                )}
                {}
                <div
                  className="absolute inset-0 pointer-events-none border-2 rounded-none transition-colors duration-500"
                  style={{
                    borderColor: attention.liveMetrics.engagement > 0.7
                      ? 'rgba(34,197,94,0.5)'
                      : attention.liveMetrics.engagement > 0.4
                        ? 'rgba(245,158,11,0.5)'
                        : 'rgba(239,68,68,0.5)'
                  }}
                />
              </div>
            </div>

            {}
            <div className="bg-hull-900 rounded-xl border border-hull-600/40 p-4">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-4 text-center">
                Live Biometrics
              </p>
              <div className="flex justify-center gap-4">
                <EngagementGauge
                  value={attention.liveMetrics.engagement}
                  label="Engage"
                  color={attention.liveMetrics.engagement > 0.7 ? '#22c55e' : attention.liveMetrics.engagement > 0.4 ? '#f59e0b' : '#ef4444'}
                />
                <EngagementGauge
                  value={attention.liveMetrics.focus}
                  label="Focus"
                  color={attention.liveMetrics.focus > 0.7 ? '#22c55e' : attention.liveMetrics.focus > 0.4 ? '#f59e0b' : '#ef4444'}
                />
              </div>

              {attention.liveMetrics.heartRate > 0 && (
                <div className="mt-4 text-center">
                  <span className="text-xs font-mono text-gray-500">HR </span>
                  <span className="text-sm font-mono font-bold text-gray-300">
                    {attention.liveMetrics.heartRate}
                  </span>
                  <span className="text-xs font-mono text-gray-500"> bpm</span>
                </div>
              )}
            </div>

            {}
            <AnimatePresence>
              {(attention.liveMetrics.engagement < 0.3 || attention.liveMetrics.focus < 0.25) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-signal-red/10 border border-signal-red/30 rounded-xl p-4 text-center glow-red"
                >
                  <AlertTriangle className="w-5 h-5 text-signal-red mx-auto mb-1" />
                  <p className="text-xs font-mono text-signal-red font-semibold">
                    LOW ATTENTION
                  </p>
                  <p className="text-[10px] text-signal-red/70 mt-0.5">
                    This item may need re-review
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-mono font-bold text-white tracking-tight">
          Review Complete
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Attention analysis for {items.length} briefing items
        </p>
      </div>

      {}
      {missedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-signal-red/5 border border-signal-red/30 rounded-xl p-6 glow-red"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-signal-red/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-signal-red" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-signal-red mb-1">
                {missedItems.length} item{missedItems.length > 1 ? 's' : ''} flagged — your attention dropped
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                Low engagement detected during these items. You must re-review them with attention tracking to confirm you've read them.
              </p>
              <div className="space-y-2 mb-4">
                {missedItems.map(m => {
                  const missedItem = items[m.itemIndex]
                  if (!missedItem) return null
                  return (
                    <div key={m.itemIndex} className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-signal-red shrink-0" />
                      <span className="text-gray-300 font-medium">{missedItem.title}</span>
                      <span className="text-xs font-mono text-gray-500 ml-auto">
                        {Math.round(m.avgEngagement * 100)}% engaged
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={startReReview}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-signal-red text-white font-semibold text-sm hover:bg-red-500 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Re-Review Missed Items (Attention-Tracked)
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {}
      <div className="bg-hull-900 rounded-xl border border-hull-600/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-hull-600/30 flex items-center justify-between">
          <h3 className="text-sm font-mono text-gray-300 uppercase tracking-wider">
            Item-by-Item Attention Report
          </h3>
          <button
            onClick={resetReview}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="divide-y divide-hull-600/20">
          {items.map((item, idx) => {
            const result = itemResults.find(r => r.itemIndex === idx)
            const missed = missedItems.some(m => m.itemIndex === idx)
            const engagement = result?.avgEngagement ?? 1
            const focus = result?.avgFocus ?? 1

            return (
              <div key={idx} className={`px-6 py-4 flex items-center gap-4 ${missed ? 'bg-signal-red/5' : ''}`}>
                {missed ? (
                  <XCircle className="w-5 h-5 text-signal-red shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-signal-green shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 font-mono">{item.machine_id} · {item.category}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-mono text-gray-500">Engage</p>
                    <p className={`text-sm font-mono font-bold ${engagement > 0.6 ? 'text-signal-green' : engagement > 0.35 ? 'text-amber-400' : 'text-signal-red'}`}>
                      {Math.round(engagement * 100)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-gray-500">Focus</p>
                    <p className={`text-sm font-mono font-bold ${focus > 0.6 ? 'text-signal-green' : focus > 0.3 ? 'text-amber-400' : 'text-signal-red'}`}>
                      {Math.round(focus * 100)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-gray-500">Time</p>
                    <p className="text-sm font-mono text-gray-300">
                      {result ? `${(result.timeSpentMs / 1000).toFixed(1)}s` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {}
      {missedItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-signal-green/5 border border-signal-green/30 rounded-xl p-6 glow-green"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-signal-green/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-signal-green" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-signal-green">
                Full Attention Maintained
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                You reviewed all {items.length} items with adequate engagement. No re-review needed.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
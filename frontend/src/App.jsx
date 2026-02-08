import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Mic, ClipboardCheck, Brain,
  AlertTriangle, ChevronRight, Radio, Zap
} from 'lucide-react'
import Dashboard from './components/Dashboard'
import RecordBriefing from './components/RecordBriefing'
import ReviewBriefing from './components/ReviewBriefing'
import KnowledgeGraph from './components/KnowledgeGraph'

const API = '/api'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'record', label: 'Record Briefing', icon: Mic },
  { id: 'review', label: 'Review Briefing', icon: ClipboardCheck },
  { id: 'knowledge', label: 'Knowledge Graph', icon: Brain },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [briefings, setBriefings] = useState([])
  const [activeBriefing, setActiveBriefing] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchBriefings = async () => {
    try {
      const res = await fetch(`${API}/briefings`)
      const data = await res.json()
      setBriefings(data)
      if (data.length > 0 && !activeBriefing) {
        setActiveBriefing(data[0])
      }
    } catch (e) {
      console.error('Failed to fetch briefings:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBriefings() }, [])

  const handleBriefingCreated = (newBriefing) => {
    fetchBriefings()
    setActiveBriefing(newBriefing)
    setPage('review')
  }

  const handleSelectBriefing = (b) => {
    setActiveBriefing(b)
    setPage('review')
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard briefings={briefings} onSelect={handleSelectBriefing} />
      case 'record':
        return <RecordBriefing onCreated={handleBriefingCreated} />
      case 'review':
        return <ReviewBriefing briefing={activeBriefing} />
      case 'knowledge':
        return <KnowledgeGraph />
      default:
        return <Dashboard briefings={briefings} onSelect={handleSelectBriefing} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-hull-900 border-r border-hull-600/30 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-hull-600/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-hull-950" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-mono font-bold text-base tracking-tight text-white">
                Vigil
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-500/70">
                Handoff Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="px-5 py-3 border-b border-hull-600/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-signal-green animate-pulse" />
            <span className="text-xs font-mono text-gray-400">
              ATTENTION ACTIVE
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-hull-700/50 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            )
          })}
        </nav>

        {/* Active briefing indicator */}
        {activeBriefing && (
          <div className="px-4 py-4 border-t border-hull-600/30">
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
              Active Briefing
            </p>
            <div className="bg-hull-800 rounded-lg p-3 border border-hull-600/40">
              <p className="text-xs font-medium text-gray-300 truncate">
                {activeBriefing.shift_label || 'Shift Handoff'}
              </p>
              <p className="text-[10px] text-gray-500 font-mono mt-1">
                {activeBriefing.structured?.items?.length || 0} items · {activeBriefing.author || 'Unknown'}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-hull-600/30">
          <p className="text-[10px] font-mono text-gray-600 text-center">
            UGAHacks 11 · General AI Track
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-hull-950 grid-bg">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

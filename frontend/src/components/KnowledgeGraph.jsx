import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, AlertTriangle, Shield, Wrench, BarChart3, Activity, TrendingUp } from 'lucide-react'

const API = '/api'

const CATEGORY_ICONS = {
  safety: Shield,
  maintenance: Wrench,
  production: BarChart3,
  quality: Activity,
}

const SEVERITY_COLORS = {
  critical: { text: 'text-signal-red', bg: 'bg-signal-red/10', border: 'border-signal-red/20' },
  warning: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  info: { text: 'text-signal-blue', bg: 'bg-signal-blue/10', border: 'border-signal-blue/20' },
}

export default function KnowledgeGraph() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/knowledge-graph`)
      .then(r => r.json())
      .then(data => setEntries(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  // Group by machine
  const byMachine = entries.reduce((acc, entry) => {
    const key = entry.machine_id || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-mono font-bold text-white tracking-tight">
          Knowledge Graph
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Recurring patterns and tribal knowledge accumulated across shift handoffs
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-hull-900 rounded-xl border border-hull-600/40 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Total Entries</span>
          </div>
          <p className="text-3xl font-mono font-bold text-amber-400">{entries.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-hull-900 rounded-xl border border-hull-600/40 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-signal-blue" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Machines</span>
          </div>
          <p className="text-3xl font-mono font-bold text-signal-blue">{Object.keys(byMachine).length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-hull-900 rounded-xl border border-hull-600/40 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-signal-green" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Recurring</span>
          </div>
          <p className="text-3xl font-mono font-bold text-signal-green">
            {entries.filter(e => e.occurrence_count > 1).length}
          </p>
        </motion.div>
      </div>

      {/* Machine-grouped entries */}
      {Object.entries(byMachine).map(([machine, issues], groupIdx) => (
        <motion.div
          key={machine}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + groupIdx * 0.05 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-hull-700 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="text-sm font-mono font-semibold text-gray-200">
              {machine}
            </h3>
            <span className="text-xs font-mono text-gray-600">
              {issues.length} issue{issues.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-hull-900 rounded-xl border border-hull-600/40 divide-y divide-hull-600/20 overflow-hidden">
            {issues.map((entry, idx) => {
              const sev = SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.info
              const CatIcon = CATEGORY_ICONS[entry.issue_type] || AlertTriangle
              return (
                <div key={idx} className="px-5 py-3.5 flex items-center gap-4">
                  <CatIcon className={`w-4 h-4 ${sev.text} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs font-mono text-gray-500">
                        {entry.issue_type} · first seen {entry.first_seen ? new Date(entry.first_seen).toLocaleDateString() : 'today'}
                      </p>
                      {entry.entity_tags?.length > 0 && entry.entity_tags.map((ent, ei) => {
                        const styles = {
                          machine: 'bg-signal-blue/10 text-signal-blue border-signal-blue/20',
                          part: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          failure_mode: 'bg-signal-red/10 text-signal-red border-signal-red/20',
                        }
                        return (
                          <span key={ei} className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-mono border ${styles[ent.type] || styles.machine}`}>
                            {ent.text}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  {entry.occurrence_count > 1 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <TrendingUp className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-amber-400">
                        ×{entry.occurrence_count}
                      </span>
                    </div>
                  )}
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${sev.bg} ${sev.text} ${sev.border} border`}>
                    {entry.severity}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      ))}

      {entries.length === 0 && !loading && (
        <div className="text-center py-20">
          <Brain className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No knowledge entries yet</p>
          <p className="text-gray-600 text-xs mt-1">Submit briefings to start building the knowledge graph</p>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Shield, Wrench, BarChart3,
  Clock, ArrowRight, Activity, Users, Mic
} from 'lucide-react'

const SEVERITY_CONFIG = {
  critical: { color: 'text-signal-red', bg: 'bg-signal-red/10', border: 'border-signal-red/30', dot: 'critical' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'warning' },
  info: { color: 'text-signal-blue', bg: 'bg-signal-blue/10', border: 'border-signal-blue/30', dot: 'info' },
}

const CATEGORY_ICONS = {
  safety: Shield,
  maintenance: Wrench,
  production: BarChart3,
  quality: Activity,
  general: Clock,
}

export default function Dashboard({ briefings, onSelect }) {

  const allItems = briefings.flatMap(b => b.structured?.items || [])
  const criticalCount = allItems.filter(i => i.severity === 'critical').length
  const warningCount = allItems.filter(i => i.severity === 'warning').length
  const machineCount = new Set(allItems.map(i => i.machine_id).filter(Boolean)).size

  const stats = [
    { label: 'Total Briefings', value: briefings.length, icon: Clock, accent: 'text-signal-blue' },
    { label: 'Critical Items', value: criticalCount, icon: AlertTriangle, accent: 'text-signal-red' },
    { label: 'Warnings', value: warningCount, icon: AlertTriangle, accent: 'text-amber-400' },
    { label: 'Machines Tracked', value: machineCount, icon: Users, accent: 'text-signal-green' },
  ]

  const latestBriefing = briefings[0]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {}
      <div className="mb-8">
        <h2 className="text-2xl font-mono font-bold text-white tracking-tight">
          Shift Intelligence
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Real-time handoff monitoring with attention-aware delivery
        </p>
      </div>

      {}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-hull-900 rounded-xl border border-hull-600/40 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-4 h-4 ${stat.accent}`} />
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  {stat.label}
                </span>
              </div>
              <p className={`text-3xl font-mono font-bold ${stat.accent}`}>
                {stat.value}
              </p>
            </motion.div>
          )
        })}
      </div>

      {}
      {latestBriefing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-mono font-semibold text-gray-300 uppercase tracking-wider">
              Latest Briefing
            </h3>
            <button
              onClick={() => onSelect(latestBriefing)}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition font-medium"
            >
              Review with attention tracking
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-hull-900 rounded-xl border border-hull-600/40 overflow-hidden">
            {}
            <div className="px-6 py-4 border-b border-hull-600/30 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white">
                  {latestBriefing.shift_label || 'Shift Handoff'}
                </span>
                <span className="text-xs text-gray-500 ml-3 font-mono">
                  by {latestBriefing.author || 'Unknown'}
                </span>
              </div>
              <span className="text-xs font-mono text-gray-500">
                {new Date(latestBriefing.created_at).toLocaleString()}
              </span>
            </div>

            {}
            {latestBriefing.structured?.summary && (
              <div className="px-6 py-3 border-b border-hull-600/20 bg-hull-800/30">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {latestBriefing.structured.summary}
                </p>
              </div>
            )}

            {}
            <div className="divide-y divide-hull-600/20">
              {latestBriefing.structured?.items?.map((item, idx) => {
                const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info
                const CatIcon = CATEGORY_ICONS[item.category] || Clock
                return (
                  <div key={idx} className="px-6 py-3.5 flex items-start gap-4 hover:bg-hull-800/30 transition">
                    <div className={`mt-0.5 status-dot ${sev.dot}`} />
                    <CatIcon className={`w-4 h-4 mt-0.5 ${sev.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        {item.machine_id} · {item.category}
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${sev.bg} ${sev.color} ${sev.border} border`}>
                      {item.severity}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {}
      {briefings.length > 1 && (
        <div>
          <h3 className="text-sm font-mono font-semibold text-gray-300 uppercase tracking-wider mb-4">
            All Briefings
          </h3>
          <div className="space-y-2">
            {briefings.map((b, i) => (
              <button
                key={b.id}
                onClick={() => onSelect(b)}
                className="w-full card-interactive bg-hull-900 rounded-lg px-5 py-3.5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-hull-700 flex items-center justify-center">
                    <span className="text-xs font-mono text-gray-400">

                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {b.shift_label || 'Shift Handoff'}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {b.structured?.items?.length || 0} items · {b.author || 'Unknown'} · {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {briefings.length === 0 && !latestBriefing && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-hull-800 flex items-center justify-center mb-4">
            <Mic className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm">No briefings yet</p>
          <p className="text-gray-600 text-xs mt-1">Record your first shift handoff to get started</p>
        </div>
      )}
    </div>
  )
}
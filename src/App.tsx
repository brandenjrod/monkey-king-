import { useState } from 'react'
import { GameState, KPIs, KPIChange, Choice, Difficulty, DecisionRecord, Scenario } from './types'
import { scenarios } from './data/scenarios'

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_KPIS: Record<Difficulty, KPIs> = {
  analyst:   { revenue: 180, profitMargin: 12, marketShare: 18, employeeSat: 72, customerSat: 75, cashReserve: 45 },
  director:  { revenue: 140, profitMargin:  8, marketShare: 12, employeeSat: 65, customerSat: 68, cashReserve: 28 },
  executive: { revenue: 100, profitMargin:  4, marketShare:  8, employeeSat: 55, customerSat: 60, cashReserve: 15 },
}

const RATINGS = [
  { min: 32, title: 'Visionary CEO',              color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/40' },
  { min: 24, title: 'Strong Leader',              color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/40' },
  { min: 16, title: 'Developing Executive',       color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/40' },
  { min:  0, title: 'Management Review Required', color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/40' },
]

const RATING_DESCS: Record<string, string> = {
  'Visionary CEO':              'Exceptional strategic leadership across all four quarters. The board and investors are fully aligned with your vision.',
  'Strong Leader':              'Solid execution with sound instincts. A few tough calls delivered real value for the company.',
  'Developing Executive':       'Promising leadership potential. Some decisions held back performance — clear focus areas identified for growth.',
  'Management Review Required': 'The board has serious concerns about decision quality. A formal performance improvement plan has been requested.',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function applyChange(kpis: KPIs, c: KPIChange): KPIs {
  return {
    revenue:      clamp(kpis.revenue      + (c.revenue      ?? 0), 0, 999),
    profitMargin: clamp(kpis.profitMargin + (c.profitMargin ?? 0), -30, 60),
    marketShare:  clamp(kpis.marketShare  + (c.marketShare  ?? 0), 0, 100),
    employeeSat:  clamp(kpis.employeeSat  + (c.employeeSat  ?? 0), 0, 100),
    customerSat:  clamp(kpis.customerSat  + (c.customerSat  ?? 0), 0, 100),
    cashReserve:  clamp(kpis.cashReserve  + (c.cashReserve  ?? 0), 0, 999),
  }
}

function totalScore(decisions: DecisionRecord[]) {
  return decisions.reduce((s, d) => s + d.choice.points, 0)
}

function getRating(score: number) {
  return RATINGS.find(r => score >= r.min)!
}

// ─── KPI Components ───────────────────────────────────────────────────────────

const KPI_META: { key: keyof KPIs; label: string; max: number; unit: string; color: string }[] = [
  { key: 'revenue',      label: 'Revenue',       max: 400,  unit: '$M', color: 'bg-emerald-500' },
  { key: 'profitMargin', label: 'Profit Margin',  max: 40,   unit: '%',  color: 'bg-blue-500' },
  { key: 'marketShare',  label: 'Market Share',   max: 50,   unit: '%',  color: 'bg-violet-500' },
  { key: 'employeeSat',  label: 'Employee Sat.',  max: 100,  unit: '',   color: 'bg-amber-500' },
  { key: 'customerSat',  label: 'Customer Sat.',  max: 100,  unit: '',   color: 'bg-rose-500' },
  { key: 'cashReserve',  label: 'Cash Reserve',   max: 150,  unit: '$M', color: 'bg-cyan-500' },
]

function KPIPanel({ kpis, changes }: { kpis: KPIs; changes?: KPIChange }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {KPI_META.map(({ key, label, max, unit, color }) => {
        const value = kpis[key]
        const change = changes ? (changes[key] ?? 0) : 0
        const pct = Math.max(0, Math.min(100, (value / max) * 100))
        const sign = change > 0 ? '+' : ''
        const changeColor = change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : ''
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{label}</span>
              <span className="font-semibold text-slate-200">
                {unit === '$M' ? `$${value}M` : `${value}${unit}`}
                {change !== 0 && (
                  <span className={`ml-1.5 ${changeColor}`}>
                    {sign}{unit === '$M' ? `$${Math.abs(change)}M` : `${sign === '' ? '' : ''}${change}${unit}`}
                  </span>
                )}
              </span>
            </div>
            <div className="kpi-bar">
              <div className={`kpi-bar-fill ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Risk Badge ────────────────────────────────────────────────────────────────

const RISK_STYLE: Record<string, string> = {
  low:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15   text-amber-400   border-amber-500/30',
  high:   'bg-red-500/15     text-red-400     border-red-500/30',
}

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${RISK_STYLE[risk]}`}>
      {risk}
    </span>
  )
}

// ─── Start Screen ─────────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: (name: string, diff: Difficulty) => void }) {
  const [name, setName] = useState('')
  const [diff, setDiff] = useState<Difficulty>('director')

  const DIFFS: { id: Difficulty; label: string; desc: string }[] = [
    { id: 'analyst',   label: 'Analyst',   desc: 'Comfortable starting KPIs' },
    { id: 'director',  label: 'Director',  desc: 'Balanced — recommended' },
    { id: 'executive', label: 'Executive', desc: 'Tight margins, high stakes' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <p className="text-blue-400 text-xs font-bold tracking-widest uppercase">Executive Training Simulation</p>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">CEO Simulation</h1>
          <p className="text-slate-400 text-sm">Four quarters of high-stakes leadership decisions.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onStart(name.trim(), diff)}
              placeholder="Enter your name"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500
                focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDiff(d.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    diff === d.id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold text-sm">{d.label}</div>
                  <div className="text-[11px] mt-0.5 leading-tight opacity-70">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => name.trim() && onStart(name.trim(), diff)}
            disabled={!name.trim()}
            className="btn-primary w-full"
          >
            Begin Simulation →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Briefing Screen ──────────────────────────────────────────────────────────

function BriefingScreen({
  playerName, difficulty, kpis, onContinue,
}: {
  playerName: string; difficulty: Difficulty; kpis: KPIs; onContinue: () => void
}) {
  const diffLabel: Record<Difficulty, string> = {
    analyst: 'Analyst Mode', director: 'Director Mode', executive: 'Executive Mode',
  }
  return (
    <div className="min-h-screen bg-slate-950 p-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="text-blue-400 text-xs font-bold tracking-widest uppercase">Situation Briefing</p>
          <h2 className="text-3xl font-extrabold text-white mt-1">Welcome, {playerName}</h2>
          <p className="text-slate-400 text-sm mt-1">You've just been appointed CEO. Here's your starting position.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Starting KPIs</p>
            <span className="text-xs text-slate-500 font-medium">{diffLabel[difficulty]}</span>
          </div>
          <KPIPanel kpis={kpis} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>You'll face <strong className="text-white">4 quarterly decisions</strong> spanning Finance, Strategy, and Operations.</p>
          <p>Each scenario presents 3 choices — each with different risk levels and KPI impacts. Your score reflects <em>decision quality</em>, not just outcomes.</p>
          <p className="text-slate-500 text-xs">Tip: Read the advisor note carefully. It doesn't always give the right answer — but it frames what's at stake.</p>
        </div>

        <button onClick={onContinue} className="btn-primary w-full">
          Start Q1 →
        </button>
      </div>
    </div>
  )
}

// ─── Playing Screen ───────────────────────────────────────────────────────────

function PlayingScreen({
  scenario, kpis, onChoose,
}: {
  scenario: Scenario; kpis: KPIs; onChoose: (choice: Choice) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  const domainClass = `domain-badge domain-${scenario.domain}`

  return (
    <div className="min-h-screen bg-slate-950 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-sm font-medium">Quarter {scenario.quarter} of 4</span>
          <span className={domainClass}>{scenario.domain}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Current KPIs</p>
          <KPIPanel kpis={kpis} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold text-white">{scenario.title}</h2>
          <p className="text-slate-300 leading-relaxed">{scenario.brief}</p>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mb-2">Context</p>
            <p className="text-slate-400 text-sm leading-relaxed">{scenario.context}</p>
          </div>

          <div className="bg-blue-950/40 border border-blue-700/30 rounded-xl p-4">
            <p className="text-[11px] text-blue-400 uppercase tracking-wider font-bold mb-2">Advisor Note</p>
            <p className="text-blue-200 text-sm leading-relaxed">{scenario.advisorNote}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-300">Choose your course of action:</p>
          {scenario.choices.map(choice => (
            <button
              key={choice.id}
              onClick={() => setSelected(choice.id)}
              className={`choice-card ${selected === choice.id ? 'selected' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  selected === choice.id
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-slate-600 text-slate-400'
                }`}>
                  {choice.label}
                </span>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">{choice.text}</p>
                <RiskBadge risk={choice.risk} />
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const choice = scenario.choices.find(c => c.id === selected)
            if (choice) onChoose(choice)
          }}
          disabled={!selected}
          className="btn-primary w-full"
        >
          Confirm Decision →
        </button>
      </div>
    </div>
  )
}

// ─── Feedback Screen ──────────────────────────────────────────────────────────

function FeedbackScreen({
  scenario, choice, kpis, newKpis, isLastQuarter, onContinue,
}: {
  scenario: Scenario
  choice: Choice
  kpis: KPIs
  newKpis: KPIs
  isLastQuarter: boolean
  onContinue: () => void
}) {
  const changes: KPIChange = {
    revenue:      newKpis.revenue      - kpis.revenue,
    profitMargin: newKpis.profitMargin - kpis.profitMargin,
    marketShare:  newKpis.marketShare  - kpis.marketShare,
    employeeSat:  newKpis.employeeSat  - kpis.employeeSat,
    customerSat:  newKpis.customerSat  - kpis.customerSat,
    cashReserve:  newKpis.cashReserve  - kpis.cashReserve,
  }

  const scoreLabel =
    choice.points >= 8 ? 'Excellent Decision' :
    choice.points >= 6 ? 'Good Decision' :
    choice.points >= 4 ? 'Fair Decision' : 'Poor Decision'

  const scoreColor =
    choice.points >= 8 ? 'text-emerald-400' :
    choice.points >= 6 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-slate-950 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <p className="text-blue-400 text-xs font-bold tracking-widest uppercase">Q{scenario.quarter} Outcome</p>
          <h2 className="text-2xl font-extrabold text-white mt-1">{scenario.title}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-16 h-16 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <span className="text-2xl font-extrabold text-white">{choice.points}</span>
          </div>
          <div>
            <p className={`text-xl font-bold ${scoreColor}`}>{scoreLabel}</p>
            <p className="text-slate-400 text-sm">Decision score: {choice.points} / 10</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mb-2">What Happened</p>
            <p className="text-slate-300 text-sm leading-relaxed">{choice.feedback}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mb-2">Market Reaction</p>
            <p className="text-slate-300 text-sm leading-relaxed">{choice.marketReaction}</p>
          </div>

          <div className="bg-violet-950/40 border border-violet-700/30 rounded-xl p-4">
            <p className="text-[11px] text-violet-400 uppercase tracking-wider font-bold mb-2">Learning Objective</p>
            <p className="text-slate-300 text-sm leading-relaxed">{scenario.learningObjective}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Updated KPIs</p>
          <KPIPanel kpis={newKpis} changes={changes} />
        </div>

        <button onClick={onContinue} className="btn-primary w-full">
          {isLastQuarter ? 'View Final Results →' : `Continue to Q${scenario.quarter + 1} →`}
        </button>
      </div>
    </div>
  )
}

// ─── Final Screen ─────────────────────────────────────────────────────────────

function FinalScreen({
  playerName, decisions, kpis, onRestart,
}: {
  playerName: string
  decisions: DecisionRecord[]
  kpis: KPIs
  onRestart: () => void
}) {
  const score = totalScore(decisions)
  const maxScore = decisions.length * 10
  const rating = getRating(score)
  const pct = Math.round((score / maxScore) * 100)

  return (
    <div className="min-h-screen bg-slate-950 p-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-blue-400 text-xs font-bold tracking-widest uppercase">Annual Performance Review</p>
          <h2 className="text-3xl font-extrabold text-white">{playerName}</h2>
        </div>

        <div className={`rounded-2xl p-6 border text-center space-y-3 ${rating.bg}`}>
          <p className={`text-3xl font-extrabold ${rating.color}`}>{rating.title}</p>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
            {RATING_DESCS[rating.title]}
          </p>
          <div className="flex items-center justify-center gap-4 pt-1">
            <span className="text-slate-400 text-sm">Score:</span>
            <span className="text-white font-bold text-lg">{score} / {maxScore}</span>
            <span className={`text-sm font-semibold ${rating.color}`}>{pct}%</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Final KPIs</p>
          <KPIPanel kpis={kpis} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mb-4">Decision History</p>
          <div className="space-y-0">
            {decisions.map((d, i) => {
              const scoreColor =
                d.choice.points >= 8 ? 'bg-emerald-500/20 text-emerald-400' :
                d.choice.points >= 6 ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              const domainClass = `domain-badge domain-${d.scenario.domain}`
              return (
                <div key={i} className="flex items-start gap-3 py-3 border-t border-slate-800 first:border-0 first:pt-0">
                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${scoreColor}`}>
                    {d.choice.points}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">{d.scenario.title}</p>
                      <span className={domainClass} style={{ padding: '1px 8px', fontSize: '10px' }}>{d.scenario.domain}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{d.choice.text}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-600 font-medium">Q{d.scenario.quarter}</span>
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={onRestart} className="btn-ghost w-full">
          Play Again
        </button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<GameState>({
    phase: 'start',
    playerName: '',
    difficulty: 'director',
    currentQuarter: 1,
    currentScenarioIndex: 0,
    kpis: INITIAL_KPIS.director,
    pendingKPIChange: null,
    decisions: [],
    lastChoice: null,
  })

  const currentScenario = scenarios.find(s => s.quarter === state.currentQuarter)

  function handleStart(name: string, difficulty: Difficulty) {
    setState(s => ({
      ...s,
      phase: 'briefing',
      playerName: name,
      difficulty,
      kpis: INITIAL_KPIS[difficulty],
    }))
  }

  function handleChoose(choice: Choice) {
    setState(s => ({
      ...s,
      phase: 'feedback',
      lastChoice: choice,
      pendingKPIChange: choice.impact,
    }))
  }

  function handleFeedbackContinue() {
    setState(s => {
      const newKpis = applyChange(s.kpis, s.pendingKPIChange ?? {})
      const newDecisions: DecisionRecord[] = [
        ...s.decisions,
        { scenario: currentScenario!, choice: s.lastChoice! },
      ]
      const isLast = s.currentQuarter >= 4
      return {
        ...s,
        kpis: newKpis,
        pendingKPIChange: null,
        decisions: newDecisions,
        phase: isLast ? 'final' : 'playing',
        currentQuarter: isLast ? s.currentQuarter : s.currentQuarter + 1,
      }
    })
  }

  function handleRestart() {
    setState({
      phase: 'start',
      playerName: '',
      difficulty: 'director',
      currentQuarter: 1,
      currentScenarioIndex: 0,
      kpis: INITIAL_KPIS.director,
      pendingKPIChange: null,
      decisions: [],
      lastChoice: null,
    })
  }

  if (state.phase === 'start') {
    return <StartScreen onStart={handleStart} />
  }

  if (state.phase === 'briefing') {
    return (
      <BriefingScreen
        playerName={state.playerName}
        difficulty={state.difficulty}
        kpis={state.kpis}
        onContinue={() => setState(s => ({ ...s, phase: 'playing' }))}
      />
    )
  }

  if ((state.phase === 'playing' || state.phase === 'feedback') && currentScenario) {
    if (state.phase === 'playing') {
      return (
        <PlayingScreen
          scenario={currentScenario}
          kpis={state.kpis}
          onChoose={handleChoose}
        />
      )
    }

    if (state.lastChoice) {
      const newKpis = applyChange(state.kpis, state.pendingKPIChange ?? {})
      return (
        <FeedbackScreen
          scenario={currentScenario}
          choice={state.lastChoice}
          kpis={state.kpis}
          newKpis={newKpis}
          isLastQuarter={state.currentQuarter >= 4}
          onContinue={handleFeedbackContinue}
        />
      )
    }
  }

  if (state.phase === 'final') {
    return (
      <FinalScreen
        playerName={state.playerName}
        decisions={state.decisions}
        kpis={state.kpis}
        onRestart={handleRestart}
      />
    )
  }

  return null
}

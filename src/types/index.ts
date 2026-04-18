export interface KPIs {
  revenue: number;        // $M
  profitMargin: number;   // %
  marketShare: number;    // %
  employeeSat: number;    // 0–100
  customerSat: number;    // 0–100
  cashReserve: number;    // $M
}

export interface KPIChange {
  revenue?: number;
  profitMargin?: number;
  marketShare?: number;
  employeeSat?: number;
  customerSat?: number;
  cashReserve?: number;
}

export type Domain = 'finance' | 'strategy' | 'operations';
export type Difficulty = 'analyst' | 'director' | 'executive';
export type Risk = 'low' | 'medium' | 'high';

export interface Choice {
  id: string;
  label: string;
  text: string;
  risk: Risk;
  points: number;   // 1–10
  impact: KPIChange;
  feedback: string;
  marketReaction: string;
}

export interface Scenario {
  id: string;
  quarter: number;
  domain: Domain;
  title: string;
  brief: string;
  context: string;
  advisorNote: string;
  choices: Choice[];
  learningObjective: string;
}

export interface DecisionRecord {
  scenario: Scenario;
  choice: Choice;
}

export type Phase = 'start' | 'briefing' | 'playing' | 'feedback' | 'quarter-summary' | 'final';

export interface GameState {
  phase: Phase;
  playerName: string;
  difficulty: Difficulty;
  currentQuarter: number;
  currentScenarioIndex: number;
  kpis: KPIs;
  pendingKPIChange: KPIChange | null;
  decisions: DecisionRecord[];
  lastChoice: Choice | null;
}

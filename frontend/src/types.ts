export interface Trade {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL';
  asset: string;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  volume: number;
  status: 'OPEN' | 'CLOSED';
  profit?: number;
  closeReason?: 'TP' | 'SL' | 'MANUAL' | 'DAILY_LIMIT' | 'FORCE_CLOSE';
  strategy: string;
}

export interface Log {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  asset?: string;
}

export interface BotConfig {
  isEnabled: boolean;
  riskPerTrade: number; // in percentage, e.g. 1%
  maxDailyTrades: number; // e.g. 3
  emaFast: number; // e.g. 50
  emaSlow: number; // e.g. 200;
  rsiPeriod: number; // e.g. 14
  rsiOverbought: number; // e.g. 70
  rsiOversold: number; // e.g. 30
  strategies: {
    trendFollowing: boolean;
    momentumBreakout: boolean;
    rsiConfluence: boolean;
  };
  balance: number;
  isDemo: boolean;
}

export interface BacktestParams {
  initialCapital: number;
  riskPerTrade: number;
  rrRatio: number;
  asset: string;
  strategy: 'trend' | 'momentum' | 'rsi' | 'multi';
  emaFast: number;
  emaSlow: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  durationMonths: number;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  initialCapital: number;
  finalBalance: number;
  totalProfit: number;
  maxDrawdown: number;
  profitFactor: number;
  weeklyConsistencyScore: number; // Out of 100
  validationPassed: boolean;
  trades: Trade[];
  equityCurve: { date: string; balance: number }[];
}

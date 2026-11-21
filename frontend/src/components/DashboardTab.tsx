import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, RefreshCw, Radio, Terminal, 
  Wallet, Percent, ShieldCheck, AlertTriangle, Play, Square,
  CheckCircle, ArrowUpRight, ArrowDownRight, Clock, Trash2
} from 'lucide-react';
import { Trade, Log, BotConfig } from '../types.js';

interface DashboardTabProps {
  data: {
    config: BotConfig;
    trades: Trade[];
    logs: Log[];
    livePrices: Record<string, {
      currentPrice: number;
      prevPrice: number;
      ema50: number;
      ema200: number;
      rsi: number;
      ticks: number[];
    }>;
  };
  onToggleBot: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

export function DashboardTab({ data, onToggleBot, onReset, onRefresh }: DashboardTabProps) {
  const { config, trades, logs, livePrices } = data;
  const [selectedAsset, setSelectedAsset] = useState<string>('Volatility 75 Index');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal to top (logs are in reverse chronological order)
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Statistics calculation
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const openTrades = trades.filter(t => t.status === 'OPEN');
  
  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winCount = closedTrades.filter(t => (t.profit || 0) > 0).length;
  const lossCount = closedTrades.filter(t => (t.profit || 0) <= 0).length;
  const winRate = closedTrades.length > 0 ? ((winCount / closedTrades.length) * 100).toFixed(1) : '0.0';

  // Drawdown tracker based on history
  let maxBalance = 10000;
  let maxDrawdown = 0;

  // Re-calculate max drawdown over history
  const historyBalances: number[] = [];
  let tempBal = 10000;
  closedTrades.slice().reverse().forEach(t => {
    tempBal += (t.profit || 0);
    historyBalances.push(tempBal);
    if (tempBal > maxBalance) maxBalance = tempBal;
    const dd = ((maxBalance - tempBal) / maxBalance) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  const profitFactor = closedTrades.length > 0
    ? (() => {
        const grossProfits = closedTrades.filter(t => (t.profit || 0) > 0).reduce((sum, t) => sum + (t.profit || 0), 0);
        const grossLosses = Math.abs(closedTrades.filter(t => (t.profit || 0) < 0).reduce((sum, t) => sum + (t.profit || 0), 0));
        return grossLosses > 0 ? (grossProfits / grossLosses).toFixed(2) : grossProfits > 0 ? '99+' : '0.00';
      })()
    : '0.00';

  const assetState = livePrices[selectedAsset];

  // Helper to draw custom SVG Chart
  const renderSVGChart = (ticks: number[]) => {
    if (!ticks || ticks.length < 2) return null;
    
    const min = Math.min(...ticks) * 0.9995;
    const max = Math.max(...ticks) * 1.0005;
    const range = max - min;
    const height = 180;
    const width = 500;

    const points = ticks.map((val, idx) => {
      const x = (idx / (ticks.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#374151" strokeDasharray="3,3" strokeWidth="0.5" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#374151" strokeDasharray="3,3" strokeWidth="0.5" />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#374151" strokeDasharray="3,3" strokeWidth="0.5" />
        
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={points}
        />

        <path
          d={`M0,${height} L${points} L${width},${height} Z`}
          fill="url(#chartGrad)"
          opacity="0.15"
        />

        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      
      {/* Bot State Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.isEnabled ? 'bg-green-500/15 text-green-400 animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Statut du Bot : {config.isEnabled ? (
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-400 inline-block"></span>
                  ACTIF (SIMULATION EN DIRECT)
                </span>
              ) : (
                <span className="text-gray-400 font-bold">INACTIF</span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {config.isEnabled 
                ? "Le simulateur génère des opportunités de trading en temps réel sur les flux ci-dessous."
                : "Activez le bot pour simuler des entrées automatiques en compte démo ou synchroniser Termux."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="toggle-bot-btn"
            onClick={onToggleBot}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              config.isEnabled 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/10' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/10'
            }`}
          >
            {config.isEnabled ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" /> Désactiver le Bot
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Activer le Bot
              </>
            )}
          </button>

          <button
            id="reset-btn"
            onClick={onReset}
            title="Réinitialiser l'historique"
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded-lg border border-gray-700 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Capital Widget */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl" id="capital-widget">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Solde</span>
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {config.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$
          </div>
          <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500 inline" /> Compte {config.isDemo ? 'Démo' : 'Réel'}
          </div>
        </div>

        {/* PnL Widget */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl" id="pnl-widget">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Profit Net (PnL)</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className={`text-lg font-bold mt-1 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}$
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Sur {closedTrades.length} trades clôturés
          </div>
        </div>

        {/* Win Rate Widget */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl" id="winrate-widget">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Winrate</span>
            <Percent className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {winRate}%
          </div>
          <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{winCount} V</span>
            <span className="text-gray-600">|</span>
            <span className="text-rose-400 font-semibold">{lossCount} D</span>
          </div>
        </div>

        {/* Profit Factor Widget */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl" id="profitfactor-widget">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Profit Factor</span>
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {profitFactor}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {Number(profitFactor) >= 1.5 ? (
              <span className="text-emerald-400 font-medium">Prop Firm Validé</span>
            ) : (
              <span className="text-yellow-400/80">Cible : &le; 1.5</span>
            )}
          </div>
        </div>

        {/* Drawdown Widget */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl col-span-2 lg:col-span-1" id="drawdown-widget">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Max Drawdown</span>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <div className={`text-lg font-bold mt-1 ${maxDrawdown > 10 ? 'text-rose-500' : 'text-yellow-400'}`}>
            {maxDrawdown.toFixed(2)}%
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Limite Prop Firm : &le; 10%
          </div>
        </div>
      </div>

      {/* Main Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Live Flux Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Marché en Direct</h3>
              </div>
              
              <div className="flex gap-2 bg-gray-950 p-1 rounded-lg border border-gray-800">
                {Object.keys(livePrices).map(asset => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                      selectedAsset === asset 
                        ? 'bg-blue-600 text-white font-medium' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {asset.includes('Volatility') ? 'Index Synthétique' : 'Forex Pair'}
                  </button>
                ))}
              </div>
            </div>

            {assetState && (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between p-3 bg-gray-950 rounded-lg border border-gray-850">
                  <div>
                    <div className="text-xs text-gray-400">{selectedAsset}</div>
                    <div className="text-2xl font-mono font-bold text-white mt-1 flex items-center gap-2">
                      {assetState.currentPrice.toLocaleString('en-US', { minimumFractionDigits: selectedAsset.includes('Volatility') ? 2 : 5 })}
                      <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        assetState.currentPrice >= assetState.prevPrice 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {assetState.currentPrice >= assetState.prevPrice ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {((Math.abs(assetState.currentPrice - assetState.prevPrice) / assetState.prevPrice) * 100).toFixed(selectedAsset.includes('Volatility') ? 3 : 4)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-gray-400">
                    <div>EMA (50): <span className="text-blue-400">{assetState.ema50.toLocaleString()}</span></div>
                    <div>RSI (14): <span className={`font-semibold ${assetState.rsi >= config.rsiOverbought ? 'text-rose-400' : assetState.rsi <= config.rsiOversold ? 'text-emerald-400' : 'text-gray-300'}`}>{assetState.rsi}</span></div>
                    <div>EMA (200): <span className="text-purple-400">{assetState.ema200.toLocaleString()}</span></div>
                    <div>Statut : <span className={config.isEnabled ? 'text-green-400 font-bold' : 'text-gray-500'}>{config.isEnabled ? 'SURVEILLÉ' : 'STABLE'}</span></div>
                  </div>
                </div>

                {/* SVG Line Chart */}
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-850 relative">
                  {renderSVGChart(assetState.ticks)}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-gray-900/90 px-2 py-1 rounded text-[10px] font-mono text-gray-300 border border-gray-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Prix Actuel
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Trades Table */}
          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Positions Ouvertes ({openTrades.length})
            </h3>

            {openTrades.length === 0 ? (
              <div className="p-6 bg-gray-950 rounded-lg border border-gray-850 text-center text-xs text-gray-500">
                Aucune position ouverte. Le bot recherche activement des confluences de trading.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                      <th className="pb-2">Date / ID</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Actif</th>
                      <th className="pb-2 text-right">Volume</th>
                      <th className="pb-2 text-right">Entrée</th>
                      <th className="pb-2 text-right">SL</th>
                      <th className="pb-2 text-right">TP</th>
                      <th className="pb-2 text-right">PnL Est.</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-gray-850">
                    {openTrades.map(trade => {
                      const curAssetPrice = livePrices[trade.asset]?.currentPrice || trade.entryPrice;
                      const pipDiff = trade.type === 'BUY' 
                        ? curAssetPrice - trade.entryPrice 
                        : trade.entryPrice - curAssetPrice;
                      const isSyntheticAsset = trade.asset.includes('Volatility');
                      const multi = isSyntheticAsset ? 1 : 100000;
                      const currentPnl = pipDiff * trade.volume * multi;

                      return (
                        <tr key={trade.id} className="text-gray-350">
                          <td className="py-2.5 font-mono">
                            <span className="text-[10px] text-gray-500 block">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                            {trade.id.substring(0, 10)}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-2.5 font-medium text-white">{trade.asset}</td>
                          <td className="py-2.5 text-right font-mono text-gray-400">{trade.volume}</td>
                          <td className="py-2.5 text-right font-mono">{trade.entryPrice.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-mono text-rose-400/80">{trade.stopLoss.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-mono text-emerald-400/80">{trade.takeProfit.toLocaleString()}</td>
                          <td className={`py-2.5 text-right font-mono font-semibold ${currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}$
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Retro Trading Log Terminal */}
        <div className="space-y-6">
          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-[535px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-400 animate-pulse" /> Console / Logs du Bot
              </h3>
              <span className="text-[10px] font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                LIVE TERMINAL
              </span>
            </div>

            {/* Terminal screen */}
            <div className="flex-1 bg-gray-950 p-4 rounded-lg border border-gray-850 font-mono text-xs overflow-y-auto space-y-2 flex flex-col-reverse max-h-[440px]">
              <div ref={terminalEndRef} />
              {logs.map((log) => (
                <div key={log.id} className="text-gray-350 leading-relaxed border-l-2 pl-2 border-gray-850 hover:bg-gray-900/50 py-1 transition-colors">
                  <span className="text-[10px] text-gray-600 block">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`font-semibold mr-1.5 ${
                    log.level === 'error' ? 'text-red-500' : log.level === 'warning' ? 'text-yellow-500' : 'text-blue-400'
                  }`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Completed Trades History */}
      <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-gray-400" /> Historique des Transactions
        </h3>

        {closedTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 bg-gray-950 rounded-lg border border-gray-850">
            Aucun trade clos disponible dans l'historique de session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                  <th className="pb-2">Date / Heure</th>
                  <th className="pb-2">ID Position</th>
                  <th className="pb-2">Actif</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Volume</th>
                  <th className="pb-2 text-right">Entrée</th>
                  <th className="pb-2 text-right">Sortie</th>
                  <th className="pb-2 text-center">Clôture</th>
                  <th className="pb-2 text-right">Stratégie</th>
                  <th className="pb-2 text-right">Gain / Perte</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-850">
                {closedTrades.map(trade => (
                  <tr key={trade.id} className="text-gray-350 hover:bg-gray-850/20">
                    <td className="py-3 text-gray-500 font-mono">
                      {new Date(trade.timestamp).toLocaleDateString()} {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 font-mono">{trade.id.substring(0, 10)}</td>
                    <td className="py-3 font-medium text-white">{trade.asset}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-gray-400">{trade.volume}</td>
                    <td className="py-3 text-right font-mono">{trade.entryPrice.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono">{trade.exitPrice?.toLocaleString()}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        trade.closeReason === 'TP' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {trade.closeReason}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-400">{trade.strategy}</td>
                    <td className={`py-3 text-right font-mono font-semibold ${
                      (trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'
                    }`}>
                      {(trade.profit || 0) >= 0 ? '+' : ''}{(trade.profit || 0).toFixed(2)}$
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

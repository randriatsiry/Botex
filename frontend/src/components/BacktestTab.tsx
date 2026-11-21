import React, { useState } from 'react';
import { 
  Play, ShieldAlert, CheckCircle, XCircle, TrendingUp, BarChart3, 
  Sparkles, Wallet, Activity
} from 'lucide-react';
import { runBacktest } from '../utils/backtestEngine';
import { BacktestParams, BacktestResult } from '../types';

export function BacktestTab() {
  const [params, setParams] = useState<BacktestParams>({
    initialCapital: 10000,
    riskPerTrade: 1.0,
    rrRatio: 2.0,
    asset: 'Volatility 75 Index',
    strategy: 'multi',
    emaFast: 50,
    emaSlow: 200,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    durationMonths: 3,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const res = runBacktest(params);
        setResult(res);
      } catch (err) {
        console.error("Backtest error: ", err);
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  const renderEquityCurve = (curve: { date: string; balance: number }[]) => {
    if (!curve || curve.length < 2) return null;

    const balances = curve.map(c => c.balance);
    const min = Math.min(...balances) * 0.99;
    const max = Math.max(...balances) * 1.01;
    const range = max - min;
    const height = 180;
    const width = 600;

    const points = curve.map((c, idx) => {
      const x = (idx / (curve.length - 1)) * width;
      const y = height - ((c.balance - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52 overflow-visible">
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#1f2937" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#1f2937" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#1f2937" strokeDasharray="3,3" />

        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          points={points}
        />

        <path
          d={`M0,${height} L${points} L${width},${height} Z`}
          fill="url(#equityGrad)"
          opacity="0.1"
        />

        <defs>
          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  return (
    <div className="space-y-6" id="backtest-tab">
      
      {/* Introduction Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/30 rounded-xl flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-white">Module de Backtesting Quantitatif — Validation 3 Mois</h3>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            Conformément au cahier des charges des Prop Firms, avant toute utilisation en conditions réelles, vos confluences de stratégies doivent être validées sur un historique de simulation de 3 mois. L'objectif est d'assurer une régularité de performance et de contrôler le Drawdown maximum.
          </p>
        </div>
      </div>

      {/* Inputs and Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Parameters selectors */}
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" /> Paramètres du Backtest
          </h3>

          {/* Asset Selection */}
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Actif Financier</label>
            <select
              value={params.asset}
              onChange={(e) => setParams({ ...params, asset: e.target.value })}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Volatility 75 Index">Synthetic: Volatility 75 Index</option>
              <option value="Volatility 100 Index">Synthetic: Volatility 100 Index</option>
              <option value="EUR/USD">Forex: EUR/USD</option>
              <option value="GBP/USD">Forex: GBP/USD</option>
            </select>
          </div>

          {/* Strategy Selection */}
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Algorithme & Stratégie</label>
            <select
              value={params.strategy}
              onChange={(e) => setParams({ ...params, strategy: e.target.value as any })}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="multi">Confluence Multi-Conditions (EMA + RSI)</option>
              <option value="trend">Trend Following (Pullback sur EMA 50/200)</option>
              <option value="momentum">Momentum / Breakout des zones</option>
              <option value="rsi">RSI Confluence (Surachat/Survente + Filtre Tendance)</option>
            </select>
          </div>

          <hr className="border-gray-800" />

          {/* Capital & Risk Management */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5 flex items-center gap-1">
                Capital Initial
              </label>
              <input
                type="number"
                value={params.initialCapital}
                onChange={(e) => setParams({ ...params, initialCapital: Number(e.target.value) })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">Risque / Trade</label>
              <select
                value={params.riskPerTrade}
                onChange={(e) => setParams({ ...params, riskPerTrade: Number(e.target.value) })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value={0.5}>0.5% (Ultra-Prudent)</option>
                <option value={1.0}>1.0% (Conseillé)</option>
                <option value={2.0}>2.0% (Agressif)</option>
                <option value={5.0}>5.0% (Risqué !)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">Ratio Risk/Reward</label>
              <select
                value={params.rrRatio}
                onChange={(e) => setParams({ ...params, rrRatio: Number(e.target.value) })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value={1.5}>1 : 1.5</option>
                <option value={2.0}>1 : 2.0 (Standard)</option>
                <option value={2.5}>1 : 2.5</option>
                <option value={3.0}>1 : 3.0 (Serré)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">Durée Historique</label>
              <select
                value={params.durationMonths}
                onChange={(e) => setParams({ ...params, durationMonths: Number(e.target.value) })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                disabled
              >
                <option value={3}>3 Mois (Cahier des charges)</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-800" />

          {/* Advanced Technical Parameters */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ajustements Techniques</h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block mb-1">EMA Rapide</span>
                <input
                  type="number"
                  value={params.emaFast}
                  onChange={(e) => setParams({ ...params, emaFast: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-1.5 font-mono text-white text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-gray-500 block mb-1">EMA Lente</span>
                <input
                  type="number"
                  value={params.emaSlow}
                  onChange={(e) => setParams({ ...params, emaSlow: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-1.5 font-mono text-white text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <span className="text-gray-500 block mb-1 text-center">Période RSI</span>
                <input
                  type="number"
                  value={params.rsiPeriod}
                  onChange={(e) => setParams({ ...params, rsiPeriod: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-1 font-mono text-white text-center focus:outline-none"
                />
              </div>
              <div>
                <span className="text-gray-500 block mb-1 text-center">Surachat</span>
                <input
                  type="number"
                  value={params.rsiOverbought}
                  onChange={(e) => setParams({ ...params, rsiOverbought: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-1 font-mono text-white text-center focus:outline-none"
                />
              </div>
              <div>
                <span className="text-gray-500 block mb-1 text-center">Survente</span>
                <input
                  type="number"
                  value={params.rsiOversold}
                  onChange={(e) => setParams({ ...params, rsiOversold: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-1 font-mono text-white text-center focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleRunBacktest}
            disabled={loading}
            className={`w-full py-2.5 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loading 
                ? 'bg-blue-600/30 text-blue-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/10'
            }`}
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-200 border-t-transparent animate-spin inline-block"></span>
                Calcul Quantitatif en cours...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Lancer le Backtest (3 Mois)
              </>
            )}
          </button>
        </div>

        {/* Right 2 columns: Backtest results analysis */}
        <div className="lg:col-span-2 space-y-6">
          
          {!result && !loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-gray-900 border border-gray-800 rounded-xl text-center">
              <BarChart3 className="h-12 w-12 text-gray-600 mb-3" />
              <h3 className="text-sm font-semibold text-gray-300">Aucun historique de test chargé</h3>
              <p className="text-xs text-gray-500 mt-1.5 max-w-sm">
                Sélectionnez vos critères de gestion du risque et lancez le backtest pour évaluer les performances et valider la stratégie.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-gray-900 border border-gray-800 rounded-xl text-center">
              <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4"></div>
              <h3 className="text-sm font-semibold text-white">Analyse Quantitative de Stratégie</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                Reconstitution de l'historique, calcul des moyennes mobiles exponentielles (EMA) et de l'oscillateur RSI, et passage au crible de {params.asset}.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Validation Status Card */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                result.validationPassed 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  {result.validationPassed ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Statut de Validation : {result.validationPassed ? (
                        <span className="text-emerald-400 font-bold uppercase tracking-wider">CONFORME</span>
                      ) : (
                        <span className="text-amber-400 font-bold uppercase tracking-wider">SOUS-PERFORMANCE</span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-300 mt-1">
                      {result.validationPassed 
                        ? "Félicitations ! Votre stratégie respecte les contraintes strictes des Prop Firms : Drawdown contenu, profit factor supérieur à 1.4 et régularité hebdomadaire."
                        : "Attention, votre stratégie ne respecte pas l'ensemble des métriques cibles. Ajustez vos confluences ou réduisez le risque avant d'envisager le trading réel."}
                    </p>
                  </div>
                </div>
                
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center shrink-0 uppercase tracking-wider ${
                  result.validationPassed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {result.validationPassed ? 'Prêt pour Démo / Réel' : 'Ajustements Requis'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Solde Final</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {result.finalBalance.toLocaleString()}$
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 block font-medium">
                    +{(result.totalProfit / result.initialCapital * 100).toFixed(1)}% de profit
                  </span>
                </div>

                <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Winrate</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {result.winRate}%
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    {result.winningTrades} G / {result.losingTrades} P
                  </span>
                </div>

                <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium flex items-center gap-1">
                    Max Drawdown
                  </span>
                  <span className={`text-lg font-bold mt-1 block ${result.maxDrawdown > 10 ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {result.maxDrawdown}%
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Cible : &le; 10.0%
                  </span>
                </div>

                <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-xs text-gray-400 block font-medium">Profit Factor</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {result.profitFactor}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Cible : &ge; 1.40
                  </span>
                </div>
              </div>

              {/* Prop Firm Checklist */}
              <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">Évaluation du Cahier des Charges (Prop Firm Score)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-gray-950 rounded-lg border border-gray-850">
                      <div className="flex items-center gap-2">
                        {result.maxDrawdown <= 10.0 ? (
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500" />
                        )}
                        <span className="text-xs text-gray-300 font-medium">Drawdown &le; 10% (Critique)</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{result.maxDrawdown}%</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-gray-950 rounded-lg border border-gray-850">
                      <div className="flex items-center gap-2">
                        {result.profitFactor >= 1.4 ? (
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500" />
                        )}
                        <span className="text-xs text-gray-300 font-medium">Profit Factor &ge; 1.40</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{result.profitFactor}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-gray-950 rounded-lg border border-gray-850">
                      <div className="flex items-center gap-2">
                        {result.winRate >= 50 ? (
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500" />
                        )}
                        <span className="text-xs text-gray-300 font-medium">Winrate Minimal &ge; 50%</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{result.winRate}%</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-gray-950 rounded-lg border border-gray-850">
                      <div className="flex items-center gap-2">
                        {result.weeklyConsistencyScore >= 65 ? (
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500" />
                        )}
                        <span className="text-xs text-gray-300 font-medium">Régularité de Session &ge; 65%</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{result.weeklyConsistencyScore}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equity Curve Chart */}
              <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-1">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-400" /> Évolution du Capital (Equity Curve)
                </h3>
                <div className="bg-gray-950 p-4 rounded-lg border border-gray-850">
                  {renderEquityCurve(result.equityCurve)}
                </div>
              </div>

              {/* Backtested Trades List */}
              <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
                <h3 className="text-sm font-semibold text-white mb-4">Trades Clôturés de la Période ({result.trades.length})</h3>
                
                <div className="overflow-y-auto max-h-[300px] border border-gray-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-950 border-b border-gray-800 font-mono text-[10px] text-gray-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2.5">Trade</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Entrée</th>
                        <th className="p-2.5 text-right">Sortie</th>
                        <th className="p-2.5 text-center">Raison</th>
                        <th className="p-2.5 text-right font-medium">Profit ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850 bg-gray-900/40">
                      {result.trades.map((trade, idx) => (
                        <tr key={trade.id} className="hover:bg-gray-850/10">
                          <td className="p-2.5 font-mono text-gray-400">
                            #{result.trades.length - idx} <span className="text-[10px] text-gray-500">({trade.id})</span>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-gray-300">{trade.entryPrice.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-mono text-gray-300">{trade.exitPrice?.toLocaleString()}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              trade.closeReason === 'TP' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {trade.closeReason}
                            </span>
                          </td>
                          <td className={`p-2.5 text-right font-mono font-semibold ${
                            (trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'
                          }`}>
                            {(trade.profit || 0) >= 0 ? '+' : ''}{(trade.profit || 0).toFixed(2)}$
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

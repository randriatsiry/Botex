import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Terminal, Sliders, Smartphone, 
  BrainCircuit, Layers, Zap, ShieldAlert
} from 'lucide-react';
import { BotConfig, Trade, Log } from './types.js';
import { DashboardTab } from './components/DashboardTab.js';
import { BacktestTab } from './components/BacktestTab.js';
import { InstructionsTab } from './components/InstructionsTab.js';
import { ConfigTab } from './components/ConfigTab.js';
import { CopilotTab } from './components/CopilotTab.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Core application state
  const [appData, setAppData] = useState<{
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
  }>({
    config: {
      isEnabled: false,
      riskPerTrade: 1.0,
      maxDailyTrades: 3,
      emaFast: 50,
      emaSlow: 200,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      strategies: { trendFollowing: true, momentumBreakout: false, rsiConfluence: true },
      balance: 10000,
      isDemo: true,
    },
    trades: [],
    logs: [],
    livePrices: {},
  });

  const getBaseApiUrl = () => {
    return import.meta.env.VITE_API_URL || '';
  };

  // Fetch data from backend API
  const fetchAppData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const baseApiUrl = getBaseApiUrl();
      const r = await fetch(`${baseApiUrl}/api/data`);
      if (!r.ok) {
        throw new Error('Impossible de charger les données du serveur.');
      }
      const data = await r.json();
      setAppData(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Erreur de synchronisation avec le backend. Assurez-vous que le serveur Express tourne.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Synchronous pulling for real-time tickers and updates
  useEffect(() => {
    fetchAppData(true);
    const interval = setInterval(() => {
      fetchAppData(false);
    }, 2500); // pull every 2.5s for snappy live charts!
    return () => clearInterval(interval);
  }, []);

  // Callback to toggle active status
  const handleToggleBot = async () => {
    const updatedStatus = !appData.config.isEnabled;
    try {
      const baseApiUrl = getBaseApiUrl();
      const response = await fetch(`${baseApiUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: updatedStatus })
      });
      if (response.ok) {
        await fetchAppData();
      }
    } catch (e) {
      console.error("Error toggling bot:", e);
    }
  };

  // Callback to save entire config
  const handleSaveConfig = async (updatedConfig: Partial<BotConfig>) => {
    try {
      const baseApiUrl = getBaseApiUrl();
      const response = await fetch(`${baseApiUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      if (response.ok) {
        await fetchAppData();
      }
    } catch (e) {
      console.error("Error saving config:", e);
    }
  };

  // Callback to reset database
  const handleReset = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser entièrement l'historique et la configuration ?")) {
      try {
        const baseApiUrl = getBaseApiUrl();
        const response = await fetch(`${baseApiUrl}/api/reset`, { method: 'POST' });
        if (response.ok) {
          await fetchAppData();
        }
      } catch (e) {
        console.error("Error resetting database:", e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-blue-600/30">
      
      {/* Header Bar */}
      <header className="bg-gray-900 border-b border-gray-850 px-6 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-900/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight uppercase">
                  Moteur & Dashboard Algorithmique Forex / Synthétiques
                </h1>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                  v1.2.0-Dist
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                Architecture Distribuée : Android (Termux) &harr; API Distante (Render Web Service)
              </p>
            </div>
          </div>

          {/* Quick status badges */}
          <div className="flex items-center gap-3 self-start md:self-auto font-mono text-[11px]">
            {/* Server Connection state */}
            <div className="flex items-center gap-1.5 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
              <span className={`h-2 w-2 rounded-full ${error ? 'bg-rose-500' : 'bg-green-400 animate-pulse'}`} />
              <span className="text-gray-400">API:</span>
              <span className={error ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                {error ? 'DÉCONNECTÉ' : 'CONNECTÉ'}
              </span>
            </div>

            {/* Simulated environment */}
            <div className="flex items-center gap-1.5 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-gray-400">MOTEUR:</span>
              <span className="text-white font-bold">TERMUX + SIM</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Connection issue warning banner if applicable */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300">
              <h4 className="font-bold">Problème de connexion détecté</h4>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Dynamic Navigation Tabs */}
        <div className="flex overflow-x-auto gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800 scrollbar-none sticky top-[73px] z-20 shadow">
          {/* Tab buttons */}
          {[
            { id: 'dashboard', label: 'Console & Direct', icon: Terminal },
            { id: 'backtest', label: 'Testeur Historique (Backtest)', icon: TrendingUp },
            { id: 'instructions', label: 'Installation Termux', icon: Smartphone },
            { id: 'config', label: 'Configuration & Paramètres', icon: Sliders },
            { id: 'copilot', label: 'IA Copilot (Gemini)', icon: BrainCircuit }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/15 font-bold' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-850'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading overlay if fetching on tab switch or first load */}
        {loading && appData.trades.length === 0 ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
            <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
            <h3 className="text-sm font-semibold text-white">Initialisation du Dashboard Quantitatif...</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              Chargement des flux d'index synthétiques, compilation de la console de logs et récupération des données.
            </p>
          </div>
        ) : (
          <div className="min-h-[500px]">
            {/* Dynamic tabs render */}
            {activeTab === 'dashboard' && (
              <DashboardTab
                data={appData}
                onToggleBot={handleToggleBot}
                onReset={handleReset}
                onRefresh={() => fetchAppData(false)}
              />
            )}

            {activeTab === 'backtest' && <BacktestTab />}

            {activeTab === 'instructions' && <InstructionsTab />}

            {activeTab === 'config' && (
              <ConfigTab
                config={appData.config}
                onSaveConfig={handleSaveConfig}
                onToggleBot={handleToggleBot}
              />
            )}

            {activeTab === 'copilot' && (
              <CopilotTab 
                config={appData.config}
                trades={appData.trades}
              />
            )}
          </div>
        )}

      </main>

      {/* Footer credit */}
      <footer className="bg-gray-900 border-t border-gray-850 px-6 py-4 mt-8 font-mono text-[10px] text-gray-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>&copy; 2026 Distributed Algo Trading Framework (Termux Core)</span>
          <span className="flex items-center justify-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" /> Approche Quantitative & Gestion Strict Risk/Reward &ge; 1:2
          </span>
        </div>
      </footer>

    </div>
  );
}

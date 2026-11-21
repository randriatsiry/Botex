import React, { useState } from 'react';
import { 
  Save, AlertCircle, ToggleLeft, ToggleRight, Settings, 
  ShieldCheck, HelpCircle, RefreshCw, Sliders, Play, Square
} from 'lucide-react';
import { BotConfig } from '../types.js';

interface ConfigTabProps {
  config: BotConfig;
  onSaveConfig: (updated: Partial<BotConfig>) => void;
  onToggleBot: () => void;
}

export function ConfigTab({ config, onSaveConfig, onToggleBot }: ConfigTabProps) {
  const [formData, setFormData] = useState<BotConfig>({ ...config });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync state if prop changes
  React.useEffect(() => {
    setFormData({ ...config });
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      onSaveConfig(formData);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const handleStrategyToggle = (key: keyof BotConfig['strategies']) => {
    setFormData({
      ...formData,
      strategies: {
        ...formData.strategies,
        [key]: !formData.strategies[key]
      }
    });
  };

  return (
    <div className="space-y-6" id="config-tab">
      
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings className="h-4.5 w-4.5 text-blue-400" /> Panneau de Configuration du Moteur Distribué
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Ajustez les contraintes opérationnelles du bot. Ces paramètres sont récupérés dynamiquement par le client Python exécuté sur Termux ou appliqués immédiatement au simulateur local.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Management Rules - Inspired by Prop Firms */}
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Gestion du Risque (Prop Firm Constraints)
          </h3>

          <div className="space-y-4">
            {/* Risk Per Trade */}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">
                Risque Maximum par Position (%)
              </label>
              <select
                value={formData.riskPerTrade}
                onChange={(e) => setFormData({ ...formData, riskPerTrade: Number(e.target.value) })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value={0.25}>0.25% (Extrêmement Conservateur)</option>
                <option value={0.5}>0.5% (Prudent)</option>
                <option value={1.0}>1.0% (Recommandé Prop Firm)</option>
                <option value={1.5}>1.5% (Modéré)</option>
                <option value={2.0}>2.0% (Agressif)</option>
              </select>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                Le bot calcule automatiquement la taille du lot en fonction de la distance du Stop Loss pour que la perte potentielle n'excède jamais ce pourcentage du capital.
              </p>
            </div>

            {/* Max Daily Trades */}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">
                Limite Journalière de Transactions (Max Daily Trades)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.maxDailyTrades}
                onChange={(e) => setFormData({ ...formData, maxDailyTrades: Number(e.target.value) })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                Empêche le sur-trading. Le bot se met en veille pour la journée s'il atteint ce quota d'exécutions (gains ou pertes).
              </p>
            </div>

            {/* Demo/Real Switcher */}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">
                Mode d'Environnement
              </label>
              <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1.5 rounded-lg border border-gray-800">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isDemo: true })}
                  className={`py-1 text-xs font-semibold rounded cursor-pointer ${
                    formData.isDemo 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Compte Démo
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isDemo: false })}
                  className={`py-1 text-xs font-semibold rounded cursor-pointer ${
                    !formData.isDemo 
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Compte Réel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Strategies & Confluences Switchers */}
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <Sliders className="h-4 w-4 text-blue-400" /> Choix des Algorithmes Actifs
          </h3>

          <div className="space-y-4">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Activez ou désactivez les modèles mathématiques d'analyse. Nous recommandons de combiner au moins deux modèles pour générer des signaux à forte probabilité.
            </p>

            {/* Trend Following Toggle */}
            <div className="flex items-start justify-between p-3 bg-gray-950 rounded-lg border border-gray-850">
              <div className="max-w-[75%]">
                <div className="text-xs font-semibold text-white">Suivi de Tendance (EMA 50/200)</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Identifie la tendance à long terme et cherche des entrées de type pullback.
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleStrategyToggle('trendFollowing')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {formData.strategies.trendFollowing ? (
                  <ToggleRight className="h-8 w-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-600" />
                )}
              </button>
            </div>

            {/* Momentum Toggle */}
            <div className="flex items-start justify-between p-3 bg-gray-950 rounded-lg border border-gray-850">
              <div className="max-w-[75%]">
                <div className="text-xs font-semibold text-white">Momentum & Breakout</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Détecte les cassures de zones de congestion et se positionne rapidement.
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleStrategyToggle('momentumBreakout')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {formData.strategies.momentumBreakout ? (
                  <ToggleRight className="h-8 w-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-600" />
                )}
              </button>
            </div>

            {/* RSI Confluence Toggle */}
            <div className="flex items-start justify-between p-3 bg-gray-950 rounded-lg border border-gray-850">
              <div className="max-w-[75%]">
                <div className="text-xs font-semibold text-white">RSI + Tendance (Filtre Quant)</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Utilise l'oscillateur RSI (14) pour acheter en survente et vendre en surachat, avec filtre de tendance EMA.
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleStrategyToggle('rsiConfluence')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {formData.strategies.rsiConfluence ? (
                  <ToggleRight className="h-8 w-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Technical Indicators Periods & Calibration */}
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <Sliders className="h-4 w-4 text-purple-400" /> Calibrage des Indicateurs
          </h3>

          <div className="space-y-4">
            {/* EMA Settings */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1 font-medium">EMA Rapide (Période)</label>
                <input
                  type="number"
                  value={formData.emaFast}
                  onChange={(e) => setFormData({ ...formData, emaFast: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-white text-center focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-medium">EMA Lente (Période)</label>
                <input
                  type="number"
                  value={formData.emaSlow}
                  onChange={(e) => setFormData({ ...formData, emaSlow: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-white text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* RSI Settings */}
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <label className="text-gray-400 block mb-1 text-center font-medium">RSI Période</label>
                <input
                  type="number"
                  value={formData.rsiPeriod}
                  onChange={(e) => setFormData({ ...formData, rsiPeriod: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-white text-center focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 text-center font-medium">Zone Surachat</label>
                <input
                  type="number"
                  value={formData.rsiOverbought}
                  onChange={(e) => setFormData({ ...formData, rsiOverbought: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-white text-center focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 text-center font-medium">Zone Survente</label>
                <input
                  type="number"
                  value={formData.rsiOversold}
                  onChange={(e) => setFormData({ ...formData, rsiOversold: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-white text-center focus:outline-none"
                />
              </div>
            </div>

            <hr className="border-gray-800" />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  saving 
                    ? 'bg-blue-600/30 text-blue-300' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/10'
                }`}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer la Config'}
              </button>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Terminal, Copy, CheckCircle2, ChevronRight, FileCode, AppWindow,
  Download, Sparkles, Smartphone, ShieldCheck, Cpu
} from 'lucide-react';
import { pythonBotCode } from '../data/pythonCode.js';

export function InstructionsTab() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [apiURL, setApiURL] = useState<string>('https://ais-dev-pj2xsog3s2bhr4uz5rq57j-642997580934.europe-west2.run.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiURL(window.location.origin);
    }
  }, []);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCustomizedPythonCode = () => {
    return pythonBotCode.replace('REPLACE_WITH_YOUR_DASHBOARD_URL', apiURL);
  };

  const setupCommands = [
    {
      title: "1. Mettre à jour les paquets Termux",
      command: "pkg update && pkg upgrade -y"
    },
    {
      title: "2. Installer Python et les outils de compilation",
      command: "pkg install python ndk-sysroot clang make -y"
    },
    {
      title: "3. Installer les dépendances Python requises",
      command: "pip install requests pandas"
    }
  ];

  const configJsonText = `{
  "API_URL": "${apiURL}",
  "API_TOKEN": "secure_token_abc123",
  "ASSET": "Volatility 75 Index",
  "RISK_PER_TRADE_PCT": 1.0,
  "RISK_REWARD_RATIO": 2.0,
  "MAX_DAILY_LOSSES": 3,
  "DEMO_MODE": true
}`;

  return (
    <div className="space-y-6" id="instructions-tab">
      
      {/* Intro header */}
      <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-400" /> Guide d'Installation 100% Mobile (Termux Android)
        </h3>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          Suivez ces étapes pour installer et exécuter le robot de trading sur votre smartphone. Grâce à cette architecture distribuée, le moteur quantitatif s'exécute localement dans le terminal Android, tandis que les performances et les trades sont centralisés en temps réel sur ce tableau de bord.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step-by-Step Shell commands installation */}
        <div className="lg:col-span-1 p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-blue-400" /> Étape 1 : Préparation Termux
          </h3>
          
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Ouvrez l'application **Termux** sur votre smartphone Android, puis copiez et exécutez les blocs de commandes suivants un par un.
          </p>

          <div className="space-y-4">
            {setupCommands.map((item, index) => (
              <div key={index} className="space-y-1.5">
                <div className="text-xs font-medium text-gray-300">{item.title}</div>
                <div className="bg-gray-950 p-2 rounded-lg border border-gray-850 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-blue-400 select-all">{item.command}</span>
                  <button
                    onClick={() => handleCopy(item.command, index)}
                    className="p-1 bg-gray-900 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedIndex === index ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] text-gray-300 leading-relaxed space-y-1.5">
            <div className="font-semibold text-yellow-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Astuce d'Exécution Android
            </div>
            <p>
              Pour éviter qu'Android n'arrête le bot lorsque l'écran s'éteint, lancez la commande suivante dans Termux :
            </p>
            <div className="font-mono bg-gray-950 p-1 rounded border border-gray-850 text-blue-300 text-center select-all">
              termux-wake-lock
            </div>
            <p>
              Pensez également à désactiver l'optimisation de batterie pour l'application Termux dans vos paramètres Android.
            </p>
          </div>
        </div>

        {/* Code Files copy panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* config.json block */}
          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-blue-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Étape 2 : Fichier de Configuration (config.json)</h4>
              </div>
              <button
                onClick={() => handleCopy(configJsonText, 100)}
                className="px-2.5 py-1 bg-gray-950 hover:bg-gray-800 rounded border border-gray-850 text-[10px] text-gray-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedIndex === 100 ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-400" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copier le code
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Créez un fichier nommé <code className="text-blue-300 bg-gray-950 px-1 py-0.5 rounded font-mono">config.json</code> dans Termux et collez-y les paramètres ci-dessous. L'URL de votre backend API a été pré-remplie automatiquement !
            </p>
            <pre className="bg-gray-950 p-3 rounded-lg border border-gray-850 text-[10px] font-mono text-gray-300 overflow-x-auto max-h-[140px]">
              {configJsonText}
            </pre>
          </div>

          {/* bot.py block */}
          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Étape 3 : Code Source du Bot (bot.py)</h4>
              </div>
              <button
                onClick={() => handleCopy(getCustomizedPythonCode(), 200)}
                className="px-2.5 py-1 bg-gray-950 hover:bg-gray-800 rounded border border-gray-850 text-[10px] text-gray-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedIndex === 200 ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-400" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copier le Script Python
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Créez le script de trading nommé <code className="text-blue-300 bg-gray-950 px-1 py-0.5 rounded font-mono">bot.py</code> dans le même dossier que le fichier config dans Termux, collez-y le code complet, puis démarrez le robot :
            </p>
            <div className="font-mono bg-gray-950 p-2 rounded-lg border border-gray-850 text-[10px] text-blue-400 flex items-center justify-between">
              <span>python bot.py</span>
              <span className="text-[9px] text-gray-500 font-sans font-medium uppercase">commande de lancement</span>
            </div>
            <pre className="bg-gray-950 p-3 rounded-lg border border-gray-850 text-[9px] font-mono text-gray-300 overflow-x-auto max-h-[220px]">
              {getCustomizedPythonCode()}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}

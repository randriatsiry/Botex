import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Trade, Log, BotConfig } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to mock database files
const TRADES_FILE = path.join(process.cwd(), 'trades.json');
const LOGS_FILE = path.join(process.cwd(), 'logs.json');
const CONFIG_FILE = path.join(process.cwd(), 'config.json');

// Initialize default config
const DEFAULT_CONFIG: BotConfig = {
  isEnabled: false,
  riskPerTrade: 1.0,
  maxDailyTrades: 3,
  emaFast: 50,
  emaSlow: 200,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  strategies: {
    trendFollowing: true,
    momentumBreakout: false,
    rsiConfluence: true,
  },
  balance: 10000,
  isDemo: true,
};

// Default initial log entries to make it alive
const DEFAULT_LOGS: Log[] = [
  {
    id: 'log_1',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    level: 'info',
    message: 'Trading Engine démarré avec succès sur Termux (Android).',
  },
  {
    id: 'log_2',
    timestamp: new Date(Date.now() - 3.8 * 3600 * 1000).toISOString(),
    level: 'info',
    message: 'Connexion à l\'API Deriv (Demo Account) établie.',
  },
  {
    id: 'log_3',
    timestamp: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    level: 'info',
    message: 'Configuration synchronisée avec l\'API distante.',
  },
  {
    id: 'log_4',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    level: 'info',
    message: 'Analyse en cours : Index Synthétique Volatility 75. EMA(50)=452320.12, EMA(200)=451150.40. Tendance haussière confirmée.',
    asset: 'Volatility 75 Index',
  }
];

// Default initial trade history (demonstrating consistency and drawdown)
const DEFAULT_TRADES: Trade[] = [
  {
    id: 't_1',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    type: 'BUY',
    asset: 'Volatility 75 Index',
    entryPrice: 450120.5,
    exitPrice: 452200.0,
    stopLoss: 449160.0,
    takeProfit: 452040.0,
    volume: 0.1,
    status: 'CLOSED',
    profit: 207.95,
    closeReason: 'TP',
    strategy: 'Trend Following (EMA 50/200)',
  },
  {
    id: 't_2',
    timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    type: 'SELL',
    asset: 'EUR/USD',
    entryPrice: 1.08540,
    exitPrice: 1.08640,
    stopLoss: 1.08640,
    takeProfit: 1.08340,
    volume: 1.0,
    status: 'CLOSED',
    profit: -100.00,
    closeReason: 'SL',
    strategy: 'RSI Confluence',
  },
  {
    id: 't_3',
    timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    type: 'BUY',
    asset: 'Volatility 100 Index',
    entryPrice: 1250.40,
    exitPrice: 1256.40,
    stopLoss: 1247.40,
    takeProfit: 1256.40,
    volume: 0.5,
    status: 'CLOSED',
    profit: 300.00,
    closeReason: 'TP',
    strategy: 'Trend Following (EMA 50/200)',
  },
  {
    id: 't_4',
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    type: 'SELL',
    asset: 'Volatility 75 Index',
    entryPrice: 451500.0,
    exitPrice: 452100.0,
    stopLoss: 452100.0,
    takeProfit: 450300.0,
    volume: 0.1,
    status: 'CLOSED',
    profit: -60.00,
    closeReason: 'SL',
    strategy: 'Momentum Breakout',
  },
  {
    id: 't_5',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    type: 'BUY',
    asset: 'GBP/USD',
    entryPrice: 1.26420,
    exitPrice: 1.26820,
    stopLoss: 1.26220,
    takeProfit: 1.26820,
    volume: 0.8,
    status: 'CLOSED',
    profit: 320.00,
    closeReason: 'TP',
    strategy: 'RSI Confluence',
  },
];

// Helper functions for reading/writing data
const loadData = <T>(filePath: string, defaultVal: T): T => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading file ${filePath}:`, e);
  }
  // Save default value if not exists
  fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
  return defaultVal;
};

const saveData = <T>(filePath: string, data: T): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error saving file ${filePath}:`, e);
  }
};

// Initial state load
let trades: Trade[] = loadData<Trade[]>(TRADES_FILE, DEFAULT_TRADES);
let logs: Log[] = loadData<Log[]>(LOGS_FILE, DEFAULT_LOGS);
let config: BotConfig = loadData<BotConfig>(CONFIG_FILE, DEFAULT_CONFIG);

// Simulated live prices
interface PriceState {
  currentPrice: number;
  prevPrice: number;
  ema50: number;
  ema200: number;
  rsi: number;
  ticks: number[];
}

const livePrices: Record<string, PriceState> = {
  'Volatility 75 Index': {
    currentPrice: 452500.0,
    prevPrice: 452490.0,
    ema50: 452350.0,
    ema200: 451800.0,
    rsi: 54,
    ticks: Array.from({ length: 30 }, (_, i) => 452000 + Math.sin(i / 3) * 1000 + i * 20),
  },
  'EUR/USD': {
    currentPrice: 1.08650,
    prevPrice: 1.08645,
    ema50: 1.08580,
    ema200: 1.08450,
    rsi: 62,
    ticks: Array.from({ length: 30 }, (_, i) => 1.08400 + Math.sin(i / 5) * 0.00200 + i * 0.0001),
  },
};

// Simulation engine for live ticking
let simInterval: NodeJS.Timeout | null = null;

const runSimulationTick = () => {
  // Update simulated assets
  Object.keys(livePrices).forEach(asset => {
    const state = livePrices[asset];
    state.prevPrice = state.currentPrice;

    // Introduce random walk with trend bias
    const isV75 = asset.includes('Volatility');
    const volatility = isV75 ? 250 : 0.00015;
    const trend = isV75 ? 30 : 0.00001; // Slightly upward bias

    const change = (Math.random() - 0.48) * volatility + trend;
    state.currentPrice = Number((state.currentPrice + change).toFixed(isV75 ? 2 : 5));

    // Dynamic EMAs & RSI simulation
    state.ema50 = Number((state.ema50 * 0.95 + state.currentPrice * 0.05).toFixed(isV75 ? 2 : 5));
    state.ema200 = Number((state.ema200 * 0.99 + state.currentPrice * 0.01).toFixed(isV75 ? 2 : 5));

    // RSI oscillator simulation
    const rsiChange = (Math.random() - 0.5) * 8 + (state.currentPrice > state.prevPrice ? 2 : -2);
    state.rsi = Math.min(95, Math.max(5, Number((state.rsi + rsiChange).toFixed(1))));

    // Manage tick history
    state.ticks.push(state.currentPrice);
    if (state.ticks.length > 50) {
      state.ticks.shift();
    }

    // If bot is active, simulate trades periodically
    if (config.isEnabled) {
      // 1. Check open trades of this asset and see if they hit TP/SL
      const openTrades = trades.filter(t => t.status === 'OPEN' && t.asset === asset);
      openTrades.forEach(trade => {
        let isClosed = false;
        let pnl = 0;
        let closeReason: 'TP' | 'SL' | 'FORCE_CLOSE' = 'FORCE_CLOSE';

        if (trade.type === 'BUY') {
          if (state.currentPrice >= trade.takeProfit) {
            isClosed = true;
            pnl = (trade.takeProfit - trade.entryPrice) * (trade.volume * (isV75 ? 1 : 100000));
            closeReason = 'TP';
          } else if (state.currentPrice <= trade.stopLoss) {
            isClosed = true;
            pnl = (trade.stopLoss - trade.entryPrice) * (trade.volume * (isV75 ? 1 : 100000));
            closeReason = 'SL';
          }
        } else { // SELL
          if (state.currentPrice <= trade.takeProfit) {
            isClosed = true;
            pnl = (trade.entryPrice - trade.takeProfit) * (trade.volume * (isV75 ? 1 : 100000));
            closeReason = 'TP';
          } else if (state.currentPrice >= trade.stopLoss) {
            isClosed = true;
            pnl = (trade.entryPrice - trade.stopLoss) * (trade.volume * (isV75 ? 1 : 100000));
            closeReason = 'SL';
          }
        }

        if (isClosed) {
          trade.status = 'CLOSED';
          trade.exitPrice = state.currentPrice;
          trade.profit = Number(pnl.toFixed(2));
          trade.closeReason = closeReason;
          config.balance = Number((config.balance + pnl).toFixed(2));

          logs.unshift({
            id: 'log_sim_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            level: pnl > 0 ? 'info' : 'warning',
            message: `[Bot Sim] Trade ${trade.type} fermé sur ${asset} à ${state.currentPrice} (${closeReason}). Résultat : ${pnl > 0 ? '+' : ''}${trade.profit}$`,
            asset
          });

          saveData(TRADES_FILE, trades);
          saveData(CONFIG_FILE, config);
          saveData(LOGS_FILE, logs);
        }
      });

      // 2. See if we can open a trade (Only if no open trades on this asset, and not exceeding daily trade limits)
      const assetOpenTrades = trades.filter(t => t.status === 'OPEN' && t.asset === asset);
      const today = new Date().toISOString().split('T')[0];
      const todayTradesCount = trades.filter(t => t.timestamp.startsWith(today)).length;

      if (assetOpenTrades.length === 0 && todayTradesCount < config.maxDailyTrades) {
        let signal: 'BUY' | 'SELL' | null = null;
        let strategyName = '';

        // Strategy A: Trend Following (EMA Cross + Pullback)
        if (config.strategies.trendFollowing) {
          const uptrend = state.currentPrice > state.ema50 && state.ema50 > state.ema200;
          const downtrend = state.currentPrice < state.ema50 && state.ema50 < state.ema200;

          // Pullback triggers
          if (uptrend && state.currentPrice <= state.ema50 * 1.0015 && state.currentPrice >= state.ema50) {
            signal = 'BUY';
            strategyName = 'Trend Following (EMA 50/200)';
          } else if (downtrend && state.currentPrice >= state.ema50 * 0.9985 && state.currentPrice <= state.ema50) {
            signal = 'SELL';
            strategyName = 'Trend Following (EMA 50/200)';
          }
        }

        // Strategy C: RSI Confluence (if Trend following didn't fire or combined)
        if (!signal && config.strategies.rsiConfluence) {
          if (state.rsi <= config.rsiOversold && state.currentPrice > state.ema200) {
            signal = 'BUY';
            strategyName = 'RSI + Trend Confluence';
          } else if (state.rsi >= config.rsiOverbought && state.currentPrice < state.ema200) {
            signal = 'SELL';
            strategyName = 'RSI + Trend Confluence';
          }
        }

        if (signal) {
          // Open trade
          const entryPrice = state.currentPrice;
          const rr = 2.0; // 1:2 Reward/Risk
          const isV75Asset = asset.includes('Volatility');

          // SL and TP calculations based on volatility
          const slDistance = isV75Asset ? entryPrice * 0.005 : entryPrice * 0.0015;
          const stopLoss = signal === 'BUY' ? entryPrice - slDistance : entryPrice + slDistance;
          const takeProfit = signal === 'BUY' ? entryPrice + (slDistance * rr) : entryPrice - (slDistance * rr);

          // Volume calculations based on 1% risk of account capital
          const riskAmount = config.balance * (config.riskPerTrade / 100);
          const pipDiff = Math.abs(entryPrice - stopLoss);
          const volume = isV75Asset 
            ? Number((riskAmount / pipDiff).toFixed(3)) 
            : Number((riskAmount / (pipDiff * 100000)).toFixed(2));

          const newTrade: Trade = {
            id: 't_sim_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            type: signal,
            asset,
            entryPrice,
            stopLoss: Number(stopLoss.toFixed(isV75Asset ? 2 : 5)),
            takeProfit: Number(takeProfit.toFixed(isV75Asset ? 2 : 5)),
            volume: Math.max(isV75Asset ? 0.005 : 0.01, volume),
            status: 'OPEN',
            strategy: strategyName,
          };

          trades.unshift(newTrade);
          logs.unshift({
            id: 'log_sim_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `[Bot Sim] Signal détecté (${strategyName}). Ouverture d'un ordre ${signal} sur ${asset} au prix de ${entryPrice}. SL: ${newTrade.stopLoss}, TP: ${newTrade.takeProfit}. Risque: ${config.riskPerTrade}%`,
            asset
          });

          saveData(TRADES_FILE, trades);
          saveData(LOGS_FILE, logs);
        }
      }
    }
  });
};

// Start simulation ticker
const startSimulation = () => {
  if (!simInterval) {
    simInterval = setInterval(runSimulationTick, 3000); // tick every 3s
  }
};

startSimulation();

// Backend REST Endpoints

// 1. Get entire app data (Dashboard sync)
app.get('/api/data', (req, res) => {
  res.json({
    config,
    trades,
    logs: logs.slice(0, 100), // Return last 100 logs
    livePrices
  });
});

// 2. Receive Trade from External Termux Bot
app.post('/api/trades', (req, res) => {
  try {
    const { type, asset, entryPrice, stopLoss, takeProfit, volume, strategy, id } = req.body;
    
    if (!type || !asset || !entryPrice || !stopLoss || !takeProfit || !volume) {
      res.status(400).json({ error: 'Champs manquants requis.' });
      return;
    }

    const newTrade: Trade = {
      id: id || 't_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type,
      asset,
      entryPrice: Number(entryPrice),
      stopLoss: Number(stopLoss),
      takeProfit: Number(takeProfit),
      volume: Number(volume),
      status: 'OPEN',
      strategy: strategy || 'External Trading Bot',
    };

    trades.unshift(newTrade);
    saveData(TRADES_FILE, trades);

    // Append log
    const logMsg: Log = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[Termux Bot] Ordre ${type} ouvert sur ${asset} à ${entryPrice}. SL: ${stopLoss}, TP: ${takeProfit}`,
      asset,
    };
    logs.unshift(logMsg);
    saveData(LOGS_FILE, logs);

    res.status(201).json({ status: 'success', trade: newTrade });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Trade (Close trade) from External Termux Bot
app.put('/api/trades/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice, profit, closeReason } = req.body;

    const tradeIndex = trades.findIndex(t => t.id === id);
    if (tradeIndex === -1) {
      res.status(404).json({ error: 'Transaction introuvable.' });
      return;
    }

    const trade = trades[tradeIndex];
    trade.status = 'CLOSED';
    trade.exitPrice = exitPrice ? Number(exitPrice) : undefined;
    trade.profit = profit ? Number(profit) : 0;
    trade.closeReason = closeReason || 'MANUAL';
    
    // Update balance
    config.balance = Number((config.balance + (profit ? Number(profit) : 0)).toFixed(2));
    saveData(CONFIG_FILE, config);
    saveData(TRADES_FILE, trades);

    // Append log
    const logMsg: Log = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: (profit || 0) >= 0 ? 'info' : 'warning',
      message: `[Termux Bot] Ordre ${trade.type} fermé sur ${trade.asset} à ${exitPrice}. Résultat: ${profit >= 0 ? '+' : ''}${profit}$ (${closeReason})`,
      asset: trade.asset,
    };
    logs.unshift(logMsg);
    saveData(LOGS_FILE, logs);

    res.json({ status: 'success', trade });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Log message from External Termux Bot
app.post('/api/logs', (req, res) => {
  try {
    const { level, message, asset } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message requis.' });
      return;
    }

    const logMsg: Log = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: level || 'info',
      message: `[Termux Bot] ${message}`,
      asset,
    };

    logs.unshift(logMsg);
    if (logs.length > 500) logs.pop(); // Keep file tidy
    saveData(LOGS_FILE, logs);

    res.status(201).json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update Config
app.post('/api/config', (req, res) => {
  try {
    config = { ...config, ...req.body };
    saveData(CONFIG_FILE, config);

    // Append config change log
    logs.unshift({
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Configuration mise à jour depuis le tableau de bord : Bot ${config.isEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}, Risque: ${config.riskPerTrade}%, Max Daily Trades: ${config.maxDailyTrades}`,
    });
    saveData(LOGS_FILE, logs);

    res.json({ status: 'success', config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reset database
app.post('/api/reset', (req, res) => {
  try {
    trades = [...DEFAULT_TRADES];
    logs = [...DEFAULT_LOGS];
    config = { ...DEFAULT_CONFIG };
    
    saveData(TRADES_FILE, trades);
    saveData(LOGS_FILE, logs);
    saveData(CONFIG_FILE, config);

    res.json({ status: 'success', message: 'Système réinitialisé avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. AI Trading Copilot Endpoint (utilizing Gemini SDK)
app.post('/api/copilot', async (req, res) => {
  try {
    const { prompt, context } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ 
        error: 'Clé API Gemini introuvable. Veuillez configurer la variable GEMINI_API_KEY dans le panneau des secrets.' 
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Enrich prompt with system instructions and current trade history data for context
    const statsSummary = {
      capital: config.balance,
      demoMode: config.isDemo,
      strategies: config.strategies,
      totalTradesCount: trades.length,
      winCount: trades.filter(t => t.status === 'CLOSED' && (t.profit || 0) > 0).length,
      lossCount: trades.filter(t => t.status === 'CLOSED' && (t.profit || 0) <= 0).length,
      openTradesCount: trades.filter(t => t.status === 'OPEN').length,
    };

    const systemPrompt = `Tu es l'assistant IA Trading Copilot pour un système de trading Forex et index synthétiques distribué (Termux + Render).
    Tu es un expert quantitatif, rigoureux, discipliné, et inspiré par la gestion du risque des prop firms (FTMO, MFF).
    Tu as accès aux données suivantes sur l'état actuel de l'utilisateur :
    - Capital actuel : ${statsSummary.capital}$
    - Mode démo : ${statsSummary.demoMode ? 'Oui' : 'Non'}
    - Stratégies actives : ${JSON.stringify(statsSummary.strategies)}
    - Total trades exécutés : ${statsSummary.totalTradesCount}
    - Nombre de gains : ${statsSummary.winCount}
    - Nombre de pertes : ${statsSummary.lossCount}
    - Positions ouvertes : ${statsSummary.openTradesCount}
    
    Analyse l'historique de trading fourni si nécessaire.
    Réponds de manière technique, réaliste, concise et extrêmement professionnelle en français. Donne des recommandations sur le risk management, l'optimisation des EMA/RSI, et l'architecture distribuée.`;

    // Call Gemini using the recommended model alias 'gemini-3.5-flash'
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nDonnées de contexte de trading additionnelles : ${JSON.stringify(context || {})}\n\nQuestion de l'utilisateur : ${prompt}` }] }
      ]
    });

    res.json({ response: response.text });
  } catch (err: any) {
    console.error('Gemini Copilot Error:', err);
    res.status(500).json({ error: `Erreur du Copilot Gemini: ${err.message}` });
  }
});

// Vite Middleware implementation for full-stack build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// --- CONFIGURATION CORS (ESSENTIEL POUR DEPLOIEMENT INDEPENDANT) ---
app.use((req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Chemins d'accès pour les fichiers de stockage JSON (Simulacre de DB robuste)
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TRADES_FILE = path.join(DATA_DIR, 'trades.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// --- STRUCTURES DE DONNÉES PAR DÉFAUT ---
const DEFAULT_CONFIG = {
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

interface Log {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  asset?: string;
}

const DEFAULT_LOGS: Log[] = [
  {
    id: 'log_init',
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Backend API démarré avec succès. Prêt à recevoir les flux de Termux.',
  }
];

const DEFAULT_TRADES = [];

// --- FONCTIONS UTILS DE PERSISTANCE DES FICHIERS ---
const loadData = <T>(filePath: string, defaultVal: T): T => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Erreur de chargement du fichier ${filePath}:`, e);
  }
  fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
  return defaultVal;
};

const saveData = <T>(filePath: string, data: T): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Erreur d'écriture du fichier ${filePath}:`, e);
  }
};

// Initialisation de la mémoire vive
let trades = loadData(TRADES_FILE, DEFAULT_TRADES);
let logs = loadData<Log[]>(LOGS_FILE, DEFAULT_LOGS);
let config = loadData(CONFIG_FILE, DEFAULT_CONFIG);

// --- ENDPOINTS DE L'API backend ---

// 1. Obtenir l'ensemble des données (Dashboard Sync)
app.get('/api/data', (req, res) => {
  res.json({
    config,
    trades,
    logs: logs.slice(0, 150) // Retourner les 150 derniers logs
  });
});

// 2. Récupérer uniquement les logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

// 3. Récupérer uniquement les transactions
app.get('/api/trades', (req, res) => {
  res.json(trades);
});

// 4. Enregistrer une nouvelle transaction (depuis le bot Termux)
app.post('/api/trades', (req, res) => {
  try {
    const { type, asset, entryPrice, stopLoss, takeProfit, volume, strategy, id } = req.body;
    
    if (!type || !asset || !entryPrice || !stopLoss || !takeProfit || !volume) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    const newTrade = {
      id: id || 't_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type,
      asset,
      entryPrice: Number(entryPrice),
      stopLoss: Number(stopLoss),
      takeProfit: Number(takeProfit),
      volume: Number(volume),
      status: 'OPEN',
      strategy: strategy || 'Termux Engine',
    };

    trades.unshift(newTrade);
    saveData(TRADES_FILE, trades);

    // Enregistrer le log
    logs.unshift({
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[Termux] Position ${type} ouverte sur ${asset} au prix de ${entryPrice}. SL: ${stopLoss}, TP: ${takeProfit}`,
      asset,
    });
    saveData(LOGS_FILE, logs);

    res.status(201).json({ status: 'success', trade: newTrade });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Clôturer ou modifier une transaction existante
app.put('/api/trades/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice, profit, closeReason } = req.body;

    const tradeIndex = trades.findIndex((t: any) => t.id === id);
    if (tradeIndex === -1) {
      return res.status(404).json({ error: 'Transaction introuvable.' });
    }

    const trade = trades[tradeIndex] as any;
    trade.status = 'CLOSED';
    trade.exitPrice = exitPrice ? Number(exitPrice) : undefined;
    trade.profit = profit ? Number(profit) : 0;
    trade.closeReason = closeReason || 'MANUAL';
    
    // Mettre à jour la balance globale
    config.balance = Number((config.balance + (profit ? Number(profit) : 0)).toFixed(2));
    saveData(CONFIG_FILE, config);
    saveData(TRADES_FILE, trades);

    // Ajouter aux logs
    logs.unshift({
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: (profit || 0) >= 0 ? 'info' : 'warning',
      message: `[Termux] Position ${trade.type} fermée sur ${trade.asset} à ${exitPrice}. Résultat: ${profit >= 0 ? '+' : ''}${profit}$ (${closeReason})`,
      asset: trade.asset,
    });
    saveData(LOGS_FILE, logs);

    res.json({ status: 'success', trade });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Ajouter un log (depuis le bot Termux)
app.post('/api/logs', (req, res) => {
  try {
    const { level, message, asset } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Le message est requis.' });
    }

    const logMsg = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: level || 'info',
      message: `[Termux] ${message}`,
      asset,
    };

    logs.unshift(logMsg);
    if (logs.length > 500) logs.pop(); // Maintenir une taille de fichier raisonnable
    saveData(LOGS_FILE, logs);

    res.status(201).json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Enregistrer la configuration du dashboard
app.post('/api/config', (req, res) => {
  try {
    config = { ...config, ...req.body };
    saveData(CONFIG_FILE, config);

    logs.unshift({
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Configuration mise à jour: Bot ${config.isEnabled ? 'ACTIF' : 'INACTIF'}, Risque: ${config.riskPerTrade}%, Max Daily Trades: ${config.maxDailyTrades}`,
    });
    saveData(LOGS_FILE, logs);

    res.json({ status: 'success', config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Réinitialiser la base de données
app.post('/api/reset', (req, res) => {
  try {
    trades = [];
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

// 9. IA Trading Copilot (Intégration Gemini 3.5 Flash)
app.post('/api/copilot', async (req, res) => {
  try {
    const { prompt, context } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Clé API Gemini introuvable. Configurez la variable GEMINI_API_KEY.' 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Contexte enrichi
    const statsSummary = {
      capital: config.balance,
      totalTradesCount: trades.length,
      winCount: trades.filter((t: any) => t.status === 'CLOSED' && (t.profit || 0) > 0).length,
      lossCount: trades.filter((t: any) => t.status === 'CLOSED' && (t.profit || 0) <= 0).length,
      openTradesCount: trades.filter((t: any) => t.status === 'OPEN').length,
    };

    const systemPrompt = `Tu es l'assistant IA Trading Copilot expert en gestion du risque (FTMO, Prop Firms).
    Données de l'utilisateur :
    - Capital actuel : ${statsSummary.capital}$
    - Total trades exécutés : ${statsSummary.totalTradesCount}
    - Nombre de gains : ${statsSummary.winCount}
    - Nombre de pertes : ${statsSummary.lossCount}
    - Positions ouvertes : ${statsSummary.openTradesCount}
    
    Réponds de manière technique, concise et professionnelle en français.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nContexte additionnel : ${JSON.stringify(context || {})}\n\nQuestion : ${prompt}` }] }
      ]
    });

    res.json({ response: response.text });
  } catch (err: any) {
    console.error('Gemini Copilot Error:', err);
    res.status(500).json({ error: `Erreur du Copilot Gemini: ${err.message}` });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Server running on port ${PORT}`);
});

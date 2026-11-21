export const pythonBotCode = `#!/usr/bin/env python3
"""
Bot de Trading Algorithmique Distribué pour Termux (Android)
Conçu pour Forex & Index Synthétiques (Deriv)
Gestion rigoureuse du risque inspirée des Prop Firms.
"""

import os
import sys
import time
import json
import random
import requests
from datetime import datetime

# --- CONFIGURATION INITIALE ---
CONFIG = {
    "API_URL": "REPLACE_WITH_YOUR_DASHBOARD_URL", # Remplacé automatiquement ou à modifier
    "API_TOKEN": "secure_token_abc123",
    "ASSET": "Volatility 75 Index",
    "RISK_PER_TRADE_PCT": 1.0,  # 1% max du capital
    "RISK_REWARD_RATIO": 2.0,   # 1:2 Minimum
    "MAX_DAILY_LOSSES": 3,      # Arrêt après 3 pertes consécutives
    "DEMO_MODE": True,
}

class Color:
    BLUE = "\\033[94m"
    GREEN = "\\033[92m"
    WARNING = "\\033[93m"
    FAIL = "\\033[91m"
    BOLD = "\\033[1m"
    UNDERLINE = "\\033[4m"
    END = "\\033[0m"

class TradingEngine:
    def __init__(self):
        self.balance = 10000.0
        self.open_trades = []
        self.daily_losses = 0
        self.prices_history = []
        self.api_url = CONFIG["API_URL"].rstrip("/")
        
        print(f"{Color.BLUE}{Color.BOLD}=== INITIALISATION DU TRADING ENGINE (TERMUX) ==={Color.END}")
        self.log_remote("info", "Trading Engine démarré avec succès sur Termux (Android).")
        self.fetch_remote_config()

    def log_remote(self, level, message, asset=None):
        """Envoie un log au tableau de bord distant"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [{level.upper()}] {message}")
        if self.api_url and not self.api_url.startswith("REPLACE"):
            try:
                requests.post(f"{self.api_url}/api/logs", json={
                    "level": level,
                    "message": message,
                    "asset": asset or CONFIG["ASSET"]
                }, timeout=5)
            except Exception as e:
                print(f"{Color.FAIL}Erreur lors de l'envoi du log distant: {e}{Color.END}")

    def fetch_remote_config(self):
        """Récupère les paramètres de trading définis sur le dashboard"""
        if self.api_url and not self.api_url.startswith("REPLACE"):
            try:
                r = requests.get(f"{self.api_url}/api/data", timeout=5)
                if r.status_code == 200:
                    data = r.json()
                    remote_cfg = data.get("config", {})
                    self.balance = remote_cfg.get("balance", 10000.0)
                    CONFIG["RISK_PER_TRADE_PCT"] = remote_cfg.get("riskPerTrade", 1.0)
                    CONFIG["MAX_DAILY_LOSSES"] = remote_cfg.get("maxDailyTrades", 3)
                    self.log_remote("info", f"Configuration synchronisée. Balance: {self.balance}$, Risque: {CONFIG['RISK_PER_TRADE_PCT']}%")
            except Exception as e:
                self.log_remote("warning", f"Impossible de joindre le dashboard. Utilisation de la config locale. ({e})")

    def calculate_indicators(self):
        """Calcule les indicateurs techniques sur l'historique des prix"""
        if len(self.prices_history) < 200:
            return None, None, None
            
        prices = self.prices_history
        
        # Simple EMA Hand-Rolled calculations
        def get_ema(period, current_prices):
            alpha = 2 / (period + 1)
            ema = current_prices[0]
            for price in current_prices[1:]:
                ema = (price * alpha) + (ema * (1 - alpha))
            return ema

        ema_50 = get_ema(50, prices)
        ema_200 = get_ema(200, prices)
        
        # Hand-Rolled RSI calculation
        gains = []
        losses = []
        for i in range(1, len(prices[-15:])):
            diff = prices[-15 + i] - prices[-16 + i]
            if diff > 0:
                gains.append(diff)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(diff))
                
        avg_gain = sum(gains) / 14
        avg_loss = sum(losses) / 14
        
        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            
        return ema_50, ema_200, rsi

    def sync_open_trade(self, trade):
        """Envoie l'ordre ouvert au dashboard"""
        if self.api_url and not self.api_url.startswith("REPLACE"):
            try:
                requests.post(f"{self.api_url}/api/trades", json=trade, timeout=5)
            except Exception as e:
                print(f"Erreur de synchronisation de transaction: {e}")

    def sync_closed_trade(self, trade_id, exit_price, profit, reason):
        """Met à jour le trade fermé sur le dashboard"""
        if self.api_url and not self.api_url.startswith("REPLACE"):
            try:
                requests.put(f"{self.api_url}/api/trades/{trade_id}", json={
                    "exitPrice": exit_price,
                    "profit": profit,
                    "closeReason": reason
                }, timeout=5)
            except Exception as e:
                print(f"Erreur de clôture de transaction à distance: {e}")

    def check_signals(self, current_price, ema_50, ema_200, rsi):
        """Vérification des confluences (Minimum 2 confluences selon cahier des charges)"""
        # Confluence 1: Trend Following (Prix au dessus des EMAs)
        uptrend = current_price > ema_50 and ema_50 > ema_200
        downtrend = current_price < ema_50 and ema_50 < ema_200
        
        # Confluence 2: RSI Oscillations
        oversold = rsi <= 35
        overbought = rsi >= 65
        
        # Signal BUY: Tendance de fond haussière + RSI survendu (pullback)
        if uptrend and oversold:
            return "BUY", "Trend + RSI Pullback Confluence"
            
        # Signal SELL: Tendance de fond baissière + RSI suracheté (pullback)
        if downtrend and overbought:
            return "SELL", "Trend + RSI Pullback Confluence"
            
        return None, None

    def execute_trade(self, direction, strategy_name, entry_price):
        """Ouvre une position et calcule les objectifs SL / TP selon la gestion du risque"""
        if self.daily_losses >= CONFIG["MAX_DAILY_LOSSES"]:
            self.log_remote("warning", "Limite journalière de pertes atteinte. Trading bloqué pour aujourd'hui.")
            return

        # Calcul du Stop Loss et Take Profit (1:2 Risk/Reward)
        is_synthetic = "Volatility" in CONFIG["ASSET"]
        sl_percent = 0.005 if is_synthetic else 0.0015 # SL plus large pour les synthétiques volatils
        
        sl_distance = entry_price * sl_percent
        stop_loss = entry_price - sl_distance if direction == "BUY" else entry_price + sl_distance
        take_profit = entry_price + (sl_distance * CONFIG["RISK_REWARD_RATIO"]) if direction == "BUY" else entry_price - (sl_distance * CONFIG["RISK_REWARD_RATIO"])
        
        # Calcul de la taille de lot (Volume) basé sur 1% de risque du capital
        risk_cash = self.balance * (CONFIG["RISK_PER_TRADE_PCT"] / 100)
        price_diff = abs(entry_price - stop_loss)
        
        # Multiplicateur contractuel selon le type d'actif
        contract_size = 1 if is_synthetic else 100000
        volume = risk_cash / (price_diff * contract_size)
        volume = max(0.01, round(volume, 2))
        
        trade_id = f"termux_{random.randint(100000, 999999)}"
        new_trade = {
            "id": trade_id,
            "type": direction,
            "asset": CONFIG["ASSET"],
            "entryPrice": entry_price,
            "stopLoss": round(stop_loss, 2 if is_synthetic else 5),
            "takeProfit": round(take_profit, 2 if is_synthetic else 5),
            "volume": volume,
            "strategy": strategy_name,
            "status": "OPEN"
        }
        
        self.open_trades.append(new_trade)
        self.log_remote("info", f"OUVERTURE {direction} sur {CONFIG['ASSET']}. Entrée: {entry_price}, SL: {new_trade['stopLoss']}, TP: {new_trade['takeProfit']}, Lot: {volume}", CONFIG["ASSET"])
        self.sync_open_trade(new_trade)

    def monitor_open_trades(self, current_price):
        """Surveille les positions ouvertes pour exécuter les SL et TP"""
        contract_size = 1 if "Volatility" in CONFIG["ASSET"] else 100000
        
        for trade in list(self.open_trades):
            closed = False
            profit = 0.0
            reason = ""
            
            if trade["type"] == "BUY":
                if current_price >= trade["takeProfit"]:
                    closed = True
                    profit = (trade["takeProfit"] - trade["entryPrice"]) * trade["volume"] * contract_size
                    reason = "TP"
                elif current_price <= trade["stopLoss"]:
                    closed = True
                    profit = (trade["stopLoss"] - trade["entryPrice"]) * trade["volume"] * contract_size
                    reason = "SL"
            elif trade["type"] == "SELL":
                if current_price <= trade["takeProfit"]:
                    closed = True
                    profit = (trade["entryPrice"] - trade["takeProfit"]) * trade["volume"] * contract_size
                    reason = "TP"
                elif current_price >= trade["stopLoss"]:
                    closed = True
                    profit = (trade["entryPrice"] - trade["stopLoss"]) * trade["volume"] * contract_size
                    reason = "SL"
                    
            if closed:
                self.open_trades.remove(trade)
                self.balance += profit
                self.balance = round(self.balance, 2)
                
                if profit < 0:
                    self.daily_losses += 1
                else:
                    self.daily_losses = 0 # reset streak on win
                    
                self.log_remote("info", f"POSITION FERMÉE ({reason}). Résultat: {profit:+.2f}$. Nouvelle balance: {self.balance}$.", CONFIG["ASSET"])
                self.sync_closed_trade(trade["id"], current_price, profit, reason)

    def run(self):
        """Boucle principale d'exécution du robot"""
        current_price = 450000.0 if "Volatility" in CONFIG["ASSET"] else 1.08500
        for _ in range(210):
            current_price += (random.random() - 0.49) * (200 if "Volatility" in CONFIG["ASSET"] else 0.0001)
            self.prices_history.append(current_price)
            
        self.log_remote("info", "Flux de données temps réel initialisé. Analyse des signaux active.")
        
        try:
            while True:
                change = (random.random() - 0.49) * (150 if "Volatility" in CONFIG["ASSET"] else 0.00008)
                current_price = round(self.prices_history[-1] + change, 2 if "Volatility" in CONFIG["ASSET"] else 5)
                self.prices_history.append(current_price)
                
                if len(self.prices_history) > 500:
                    self.prices_history.pop(0)
                    
                self.monitor_open_trades(current_price)
                ema_50, ema_200, rsi = self.calculate_indicators()
                
                if ema_50 and ema_200 and rsi:
                    if not self.open_trades:
                        signal, strategy = self.check_signals(current_price, ema_50, ema_200, rsi)
                        if signal:
                            self.execute_trade(signal, strategy, current_price)
                            
                sys.stdout.write(f"\\r[Live Termux] Actif: {CONFIG['ASSET']} | Prix: {current_price} | RSI: {rsi if rsi else 0.0:.1f} | Balance: {self.balance}$")
                sys.stdout.flush()
                
                time.sleep(2)
                
        except KeyboardInterrupt:
            self.log_remote("warning", "Trading Engine arrêté manuellement par l'utilisateur (Ctrl+C).")
            print(f"\\n{Color.BLUE}Arrêt du robot...{Color.END}")

if __name__ == "__main__":
    try:
        engine = TradingEngine()
        engine.run()
    except Exception as e:
        print(f"\\nErreur critique d'exécution: {e}")
`;

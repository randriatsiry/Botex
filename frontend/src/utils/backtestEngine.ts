import { Trade, BacktestParams, BacktestResult } from '../types.js';

// Generates synthetic candlestick data representing 3 months of history
export function generateSyntheticHistory(asset: string, trendType: 'up' | 'down' | 'range' | 'volatile'): number[] {
  const prices: number[] = [];
  let basePrice = asset.includes('Volatility') ? 450000 : 1.08500;
  const steps = 300;
  
  const stepSize = asset.includes('Volatility') ? 800 : 0.0003;
  let trendBias = 0;
  
  if (trendType === 'up') trendBias = asset.includes('Volatility') ? 120 : 0.00005;
  if (trendType === 'down') trendBias = asset.includes('Volatility') ? -120 : -0.00005;

  for (let i = 0; i < steps; i++) {
    const wave = Math.sin(i / 15) * (asset.includes('Volatility') ? 3500 : 0.0015);
    const noise = (Math.random() - 0.5) * stepSize;
    
    let breakout = 0;
    if (trendType === 'volatile' && i % 60 === 0 && i > 0) {
      breakout = (Math.random() - 0.5) * (asset.includes('Volatility') ? 12000 : 0.0050);
    }

    basePrice += trendBias + noise + breakout;
    prices.push(Number((basePrice + wave).toFixed(asset.includes('Volatility') ? 2 : 5)));
  }

  return prices;
}

// Calculate indicators for backtesting
function calculateIndicators(prices: number[], emaFastPeriod: number, emaSlowPeriod: number, rsiPeriod: number) {
  const emaFast: number[] = [];
  const emaSlow: number[] = [];
  const rsi: number[] = [];

  function computeEMA(period: number, data: number[]): number[] {
    const ema: number[] = [];
    const k = 2 / (period + 1);
    
    let currentEma = data[0];
    ema.push(currentEma);

    for (let i = 1; i < data.length; i++) {
      currentEma = data[i] * k + currentEma * (1 - k);
      ema.push(currentEma);
    }
    return ema;
  }

  const fastEmaVals = computeEMA(emaFastPeriod, prices);
  const slowEmaVals = computeEMA(emaSlowPeriod, prices);

  for (let i = 0; i < prices.length; i++) {
    if (i < rsiPeriod) {
      rsi.push(50);
      continue;
    }

    let gains = 0;
    let losses = 0;

    for (let j = i - rsiPeriod + 1; j <= i; j++) {
      const diff = prices[j] - prices[j - 1];
      if (diff > 0) {
        gains += diff;
      } else {
        losses += Math.abs(diff);
      }
    }

    const avgGain = gains / rsiPeriod;
    const avgLoss = losses / rsiPeriod;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(Number((100 - 100 / (1 + rs)).toFixed(1)));
    }
  }

  return { emaFast: fastEmaVals, emaSlow: slowEmaVals, rsi };
}

// Full Backtest Simulator
export function runBacktest(params: BacktestParams): BacktestResult {
  const {
    initialCapital,
    riskPerTrade,
    rrRatio,
    asset,
    strategy,
    emaFast: emaFastPeriod,
    emaSlow: emaSlowPeriod,
    rsiPeriod,
    rsiOverbought,
    rsiOversold,
  } = params;

  const p1 = generateSyntheticHistory(asset, 'up');
  const p2 = generateSyntheticHistory(asset, 'range');
  const p3 = generateSyntheticHistory(asset, 'down');
  const prices = [...p1, ...p2, ...p3];

  const { emaFast, emaSlow, rsi } = calculateIndicators(prices, emaFastPeriod, emaSlowPeriod, rsiPeriod);

  let currentBalance = initialCapital;
  let maxBalance = initialCapital;
  let maxDrawdown = 0;
  const backtestTrades: Trade[] = [];
  const equityCurve: { date: string; balance: number }[] = [];

  equityCurve.push({ date: 'Début', balance: initialCapital });

  const isSynthetic = asset.includes('Volatility');
  const contractSize = isSynthetic ? 1 : 100000;

  let activeTrade: Trade | null = null;
  let dailyLossesToday = 0;
  let lastTradeDayIdx = -1;

  for (let i = 200; i < prices.length; i++) {
    const currentPrice = prices[i];
    const prevPrice = prices[i - 1];
    
    const currentDayIdx = Math.floor(i / 20);
    if (currentDayIdx !== lastTradeDayIdx) {
      dailyLossesToday = 0;
      lastTradeDayIdx = currentDayIdx;
    }

    if (activeTrade) {
      let isClosed = false;
      let pnl = 0;
      let closeReason: 'TP' | 'SL' | 'FORCE_CLOSE' = 'FORCE_CLOSE';

      if (activeTrade.type === 'BUY') {
        if (currentPrice >= activeTrade.takeProfit) {
          isClosed = true;
          pnl = (activeTrade.takeProfit - activeTrade.entryPrice) * activeTrade.volume * contractSize;
          closeReason = 'TP';
        } else if (currentPrice <= activeTrade.stopLoss) {
          isClosed = true;
          pnl = (activeTrade.stopLoss - activeTrade.entryPrice) * activeTrade.volume * contractSize;
          closeReason = 'SL';
        }
      } else {
        if (currentPrice <= activeTrade.takeProfit) {
          isClosed = true;
          pnl = (activeTrade.entryPrice - activeTrade.takeProfit) * activeTrade.volume * contractSize;
          closeReason = 'TP';
        } else if (currentPrice >= activeTrade.stopLoss) {
          isClosed = true;
          pnl = (activeTrade.entryPrice - activeTrade.stopLoss) * activeTrade.volume * contractSize;
          closeReason = 'SL';
        }
      }

      if (isClosed) {
        currentBalance += pnl;
        activeTrade.status = 'CLOSED';
        activeTrade.exitPrice = currentPrice;
        activeTrade.profit = Number(pnl.toFixed(2));
        activeTrade.closeReason = closeReason;
        backtestTrades.push(activeTrade);

        if (currentBalance > maxBalance) {
          maxBalance = currentBalance;
        }
        const dd = ((maxBalance - currentBalance) / maxBalance) * 100;
        if (dd > maxDrawdown) {
          maxDrawdown = dd;
        }

        if (pnl < 0) {
          dailyLossesToday++;
        }

        equityCurve.push({
          date: `T#${backtestTrades.length}`,
          balance: Number(currentBalance.toFixed(2))
        });

        activeTrade = null;
      }
    }

    if (!activeTrade && dailyLossesToday < 3) {
      let signal: 'BUY' | 'SELL' | null = null;
      let selectedStrategy = '';

      const uptrend = currentPrice > emaFast[i] && emaFast[i] > emaSlow[i];
      const downtrend = currentPrice < emaFast[i] && emaFast[i] < emaSlow[i];

      const oversold = rsi[i] <= rsiOversold;
      const overbought = rsi[i] >= rsiOverbought;

      if (strategy === 'trend') {
        const pullbackUp = uptrend && currentPrice <= emaFast[i] * 1.001 && currentPrice >= emaFast[i] * 0.999;
        const pullbackDown = downtrend && currentPrice >= emaFast[i] * 0.999 && currentPrice <= emaFast[i] * 1.001;
        if (pullbackUp) {
          signal = 'BUY';
          selectedStrategy = 'Trend Following (EMA)';
        } else if (pullbackDown) {
          signal = 'SELL';
          selectedStrategy = 'Trend Following (EMA)';
        }
      } else if (strategy === 'rsi') {
        if (oversold && currentPrice > emaSlow[i]) {
          signal = 'BUY';
          selectedStrategy = 'RSI + EMA Trend Confluence';
        } else if (overbought && currentPrice < emaSlow[i]) {
          signal = 'SELL';
          selectedStrategy = 'RSI + EMA Trend Confluence';
        }
      } else if (strategy === 'momentum') {
        const lookback = 10;
        const recentHighs = prices.slice(i - lookback, i);
        const maxHigh = Math.max(...recentHighs);
        const minLow = Math.min(...recentHighs);

        if (currentPrice > maxHigh && prevPrice <= maxHigh && uptrend) {
          signal = 'BUY';
          selectedStrategy = 'Momentum Breakout';
        } else if (currentPrice < minLow && prevPrice >= minLow && downtrend) {
          signal = 'SELL';
          selectedStrategy = 'Momentum Breakout';
        }
      } else if (strategy === 'multi') {
        if (uptrend && oversold) {
          signal = 'BUY';
          selectedStrategy = 'Multi-Confluence Quant';
        } else if (downtrend && overbought) {
          signal = 'SELL';
          selectedStrategy = 'Multi-Confluence Quant';
        }
      }

      if (signal) {
        const riskAmount = currentBalance * (riskPerTrade / 100);
        const slPercent = isSynthetic ? 0.005 : 0.0012;
        const slDistance = currentPrice * slPercent;
        
        const stopLoss = signal === 'BUY' ? currentPrice - slDistance : currentPrice + slDistance;
        const takeProfit = signal === 'BUY' ? currentPrice + (slDistance * rrRatio) : currentPrice - (slDistance * rrRatio);

        const priceDiff = Math.abs(currentPrice - stopLoss);
        const volume = riskAmount / (priceDiff * contractSize);

        const formattedDate = new Date(Date.now() - (prices.length - i) * 6 * 3600 * 1000).toISOString();

        activeTrade = {
          id: `bt_${i}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: formattedDate,
          type: signal,
          asset,
          entryPrice: currentPrice,
          stopLoss: Number(stopLoss.toFixed(isSynthetic ? 2 : 5)),
          takeProfit: Number(takeProfit.toFixed(isSynthetic ? 2 : 5)),
          volume: Math.max(isSynthetic ? 0.01 : 0.01, Number(volume.toFixed(2))),
          status: 'OPEN',
          strategy: selectedStrategy
        };
      }
    }
  }

  if (activeTrade) {
    activeTrade.status = 'CLOSED';
    activeTrade.exitPrice = prices[prices.length - 1];
    const pnl = activeTrade.type === 'BUY' 
      ? (activeTrade.exitPrice - activeTrade.entryPrice) * activeTrade.volume * contractSize
      : (activeTrade.entryPrice - activeTrade.exitPrice) * activeTrade.volume * contractSize;
    activeTrade.profit = Number(pnl.toFixed(2));
    activeTrade.closeReason = 'FORCE_CLOSE';
    currentBalance += pnl;
    backtestTrades.push(activeTrade);
    equityCurve.push({ date: 'Fin', balance: Number(currentBalance.toFixed(2)) });
  }

  const totalTrades = backtestTrades.length;
  const winningTrades = backtestTrades.filter(t => (t.profit || 0) > 0).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
  const totalProfit = Number((currentBalance - initialCapital).toFixed(2));

  const sumWins = backtestTrades.filter(t => (t.profit || 0) > 0).reduce((sum, t) => sum + (t.profit || 0), 0);
  const sumLosses = Math.abs(backtestTrades.filter(t => (t.profit || 0) < 0).reduce((sum, t) => sum + (t.profit || 0), 0));
  const profitFactor = sumLosses > 0 ? Number((sumWins / sumLosses).toFixed(2)) : sumWins > 0 ? 99.9 : 0;

  const weeksCount = 12;
  const tradesPerWeek = Math.max(1, Math.ceil(totalTrades / weeksCount));
  let positiveWeeks = 0;
  for (let w = 0; w < weeksCount; w++) {
    const weeklyTrades = backtestTrades.slice(w * tradesPerWeek, (w + 1) * tradesPerWeek);
    const weeklyProfit = weeklyTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    if (weeklyProfit > 0 || (weeklyTrades.length === 0 && currentBalance > initialCapital)) {
      positiveWeeks++;
    }
  }
  const weeklyConsistencyScore = Math.round((positiveWeeks / weeksCount) * 100);

  const validationPassed = winRate >= 50 && maxDrawdown <= 10.0 && profitFactor >= 1.4 && weeklyConsistencyScore >= 65;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    initialCapital,
    finalBalance: Number(currentBalance.toFixed(2)),
    totalProfit,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    profitFactor,
    weeklyConsistencyScore,
    validationPassed,
    trades: backtestTrades.reverse(),
    equityCurve
  };
}

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, BrainCircuit, ShieldAlert, Cpu, 
  HelpCircle, ChevronRight, MessageSquare, AlertCircle
} from 'lucide-react';
import { Trade, BotConfig } from '../types.js';

interface CopilotTabProps {
  config: BotConfig;
  trades: Trade[];
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export function CopilotTab({ config, trades }: CopilotTabProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Bonjour ! Je suis votre **IA Trading Copilot**. J'ai analysé l'état de votre bot, votre capital actuel et vos dernières transactions.\n\nComment puis-je vous aider aujourd'hui ? Vous pouvez me demander d'analyser vos performances, de calibrer vos paramètres d'indicateurs ou de rédiger une stratégie de gestion du risque conforme aux Prop Firms.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const userPrompt = textToSend || prompt;
    if (!userPrompt.trim()) return;

    if (!textToSend) setPrompt('');

    // Add user message
    const userMsg: Message = {
      sender: 'user',
      text: userPrompt,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build trading history summary for context
      const context = {
        config,
        tradeHistorySummary: trades.map(t => ({
          type: t.type,
          asset: t.asset,
          profit: t.profit || 0,
          closeReason: t.closeReason,
          strategy: t.strategy,
          timestamp: t.timestamp
        })).slice(0, 15) // send last 15 trades for rich context
      };

      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, context })
      });

      const resData = await response.json();
      if (response.ok && resData.response) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: resData.response,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: `⚠️ **Erreur lors de la communication avec Gemini** : ${resData.error || 'Erreur inconnue.'}\n\nVeuillez vérifier que la clé API **GEMINI_API_KEY** est correctement configurée dans le panneau des Secrets de l'application.`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `⚠️ **Erreur réseau** : Impossible de contacter l'API du Copilot. (${err.message})`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Analyse mes performances de trading et mes drawdowns",
    "Comment configurer le ratio Risk/Reward idéal ?",
    "Quelles sont les confluences à privilégier pour l'index Volatility 75 ?",
    "Rédige-moi un plan de gestion de risque Prop Firm strict"
  ];

  // Helper to format markdown headers, lists, code, and bold text in HTML safely
  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-white mt-3 mb-1.5">{trimmed.replace('### ', '')}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-bold text-white mt-4 mb-2">{trimmed.replace('## ', '')}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-extrabold text-white mt-5 mb-3">{trimmed.replace('# ', '')}</h2>;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-gray-300 ml-4 py-0.5">
            <span className="text-blue-400 mt-1 shrink-0">•</span>
            <span>{parseInlineStyles(content)}</span>
          </div>
        );
      }

      // Code blocks (simple representation)
      if (trimmed.startsWith('```')) {
        return null; // Skip markdown boundary lines
      }

      if (line.includes('`')) {
        // Render simple inline code or code lines
        return (
          <p key={idx} className="text-xs text-gray-300 leading-relaxed font-mono bg-gray-950 p-2 rounded border border-gray-850 my-1">
            {parseInlineStyles(line)}
          </p>
        );
      }

      // Standard Paragraph
      if (trimmed === '') return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-xs text-gray-300 leading-relaxed">{parseInlineStyles(line)}</p>;
    });
  };

  const parseInlineStyles = (text: string): React.ReactNode => {
    // Basic regex replacement for bold **text** and `code` inline
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-gray-950 px-1 py-0.5 rounded text-blue-300 font-mono text-[10px] border border-gray-850">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="copilot-tab">
      
      {/* Suggestions / Prompt helpers */}
      <div className="lg:col-span-1 p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-800 pb-2">
          <BrainCircuit className="h-4 w-4 text-purple-400 animate-pulse" /> IA Trading Assistant
        </h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Le Copilot est propulsé par **Gemini 3.5**. Il est capable de consulter votre historique de trading actuel et de formuler des critiques d'expert sur vos performances.
        </p>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase">Exemples de Questions</span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="w-full text-left p-2 bg-gray-950 hover:bg-gray-800 rounded-lg text-[10px] text-gray-300 hover:text-white border border-gray-850 transition-colors flex items-start gap-1 cursor-pointer"
            >
              <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-blue-400" />
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat screen */}
      <div className="lg:col-span-3 p-5 bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-[520px]">
        
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`p-2.5 rounded-xl text-xs space-y-2 border ${
                m.sender === 'user' 
                  ? 'bg-blue-600/10 border-blue-500/20 text-white rounded-br-none' 
                  : 'bg-gray-950 border-gray-850 text-gray-300 rounded-bl-none'
              }`}>
                {m.sender === 'ai' ? (
                  <div className="space-y-1.5">
                    {formatMarkdown(m.text)}
                  </div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                )}
                <span className="text-[8px] text-gray-600 block text-right font-mono mt-1">
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="p-3 bg-gray-950 border border-gray-850 rounded-xl rounded-bl-none flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"></span>
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[10px] text-gray-500 font-mono ml-1">L'IA Trading Copilot analyse...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Prompt Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            placeholder="Posez une question technique sur votre stratégie ou demandez une analyse..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer disabled:bg-blue-600/30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}

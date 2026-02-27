import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Zap } from 'lucide-react';
import { api } from '../api/client';

interface Message { role: 'user' | 'assistant'; content: string; confidence?: number; timestamp: string; }

const SUGGESTED = [
    "Why is load high today?",
    "What is the peak risk?",
    "How much carbon did we save?",
    "Should we charge EVs now?",
    "What's driving demand?",
    "Explain renewable share",
];

const ChatAssistant: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "⚡ Hello! I'm GridGuard AI assistant. I can answer questions about grid load, peak demand, renewable generation, carbon savings, EV management, or risk scores. How can I help?",
            confidence: 1,
            timestamp: new Date().toISOString(),
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;
        const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
        setMessages(m => [...m, userMsg]);
        setInput('');
        setLoading(true);
        try {
            const r = await api.chat(text);
            setMessages(m => [...m, {
                role: 'assistant',
                content: r.data.reply,
                confidence: r.data.confidence,
                timestamp: r.data.timestamp,
            }]);
        } catch {
            setMessages(m => [...m, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            <div>
                <h1 className="text-2xl font-bold text-white">AI Grid Assistant</h1>
                <p className="text-slate-400 text-sm mt-1">Ask anything about your grid — powered by GridGuard AI</p>
            </div>

            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-2">
                {SUGGESTED.map(s => (
                    <motion.button key={s} onClick={() => sendMessage(s)}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all">
                        {s}
                    </motion.button>
                ))}
            </div>

            {/* Chat Window */}
            <div className="glass-card flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}>
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                            )}
                            <div className={`max-w-lg ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} p-3`}>
                                <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                                {msg.confidence !== undefined && msg.role === 'assistant' && (
                                    <p className="text-xs mt-1 opacity-50">Confidence: {(msg.confidence * 100).toFixed(0)}%</p>
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-slate-300" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}>
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="chat-bubble-ai p-3">
                            <div className="flex gap-1">
                                {[0, 0.2, 0.4].map(d => (
                                    <span key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                        style={{ animationDelay: `${d}s` }} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="glass-card p-3 flex gap-3">
                <input
                    className="input-field flex-1 py-2 text-sm"
                    placeholder="Ask about load, risk, renewables, EV charging…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                    disabled={loading}
                />
                <motion.button
                    className="btn-primary px-4 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                >
                    <Send className="w-4 h-4" />
                </motion.button>
            </div>
        </div>
    );
};

export default ChatAssistant;

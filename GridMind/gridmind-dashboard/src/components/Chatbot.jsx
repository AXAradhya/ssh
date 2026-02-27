import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Trash2, Sparkles, AlertTriangle, Bot } from 'lucide-react';
import { sendChatMessage, getChatHistory, clearChatHistory, getAiAlerts } from '../api/apiClient';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAlerts, setAiAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef(null);

  // Load chat history on open
  useEffect(() => {
    if (isOpen) {
      getChatHistory().then(res => {
        setMessages(res.messages || []);
        setUnread(0);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Fetch AI alerts on mount
  useEffect(() => {
    getAiAlerts().then(res => {
      const alerts = res.alerts || [];
      setAiAlerts(alerts);
      if (alerts.length > 0) setUnread(alerts.length);
    }).catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await sendChatMessage(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, timestamp: new Date().toISOString() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error: Could not reach the AI service.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const handleClear = async () => {
    await clearChatHistory().catch(() => {});
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const severityColor = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="chatbot-fab" aria-label="Open AI chat">
          <div className="chatbot-fab-inner">
            <Bot size={22} />
            {unread > 0 && <span className="chatbot-badge">{unread}</span>}
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} style={{ color: '#fbbf24' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>GridMind AI</span>
              <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 600 }}>GEMINI</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setShowAlerts(!showAlerts)} className="chatbot-icon-btn" title="AI Alerts">
                <AlertTriangle size={14} style={{ color: aiAlerts.length > 0 ? '#f59e0b' : 'var(--text-muted)' }} />
              </button>
              <button onClick={handleClear} className="chatbot-icon-btn" title="Clear chat">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setIsOpen(false)} className="chatbot-icon-btn" title="Close">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* AI Alerts Panel */}
          {showAlerts && aiAlerts.length > 0 && (
            <div className="chatbot-alerts">
              {aiAlerts.map((a, i) => (
                <div key={i} className="chatbot-alert-item" style={{ borderLeftColor: severityColor[a.severity] || '#3b82f6' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: severityColor[a.severity] }}>{a.title}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{a.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="chatbot-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <Sparkles size={28} style={{ color: '#fbbf24', marginBottom: 8 }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Hey! I'm GridMind AI</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Ask me about load data, forecasts, alerts, or anything about the grid.
                </div>
                <div className="chatbot-suggestions">
                  {['What is the current load?', 'Show active alerts', 'Summarize today\'s data', 'Any anomalies detected?'].map((q, i) => (
                    <button key={i} onClick={() => { setInput(q); }} className="chatbot-suggestion">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-msg ${m.role}`}>
                <div className="chatbot-msg-content">{m.content}</div>
                <div className="chatbot-msg-time">
                  {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg assistant">
                <div className="chatbot-msg-content chatbot-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="chatbot-input-area">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask GridMind anything..."
              className="chatbot-input"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading} className="chatbot-send-btn">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

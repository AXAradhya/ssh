import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export default function InterventionFeed({ interventions }) {
  if (!interventions?.length) return null;

  return (
    <div className="glass-card grid-col-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="card-header">
        <span className="card-title"><Bot /> AI Interventions</span>
        <span className="card-badge badge-ai">AI AGENT</span>
      </div>
      <div className="intervention-feed">
        {interventions.map((item, i) => (
          <motion.div
            key={item.id}
            className={`intervention-card type-${item.type}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <div className="intervention-type" style={{
              color: item.type === 'alert' ? 'var(--accent-red)' :
                item.type === 'tariff' ? 'var(--accent-amber)' :
                  item.type === 'nudge' ? 'var(--accent-green)' :
                    item.type === 'curtail' ? 'var(--accent-secondary)' :
                      'var(--accent-cyan)'
            }}>
              {item.icon} {item.category}
            </div>
            <div className="intervention-text">{item.text}</div>
            <div className="intervention-meta">
              <span>🤖 GridMind AI</span>
              <span>•</span>
              <span>{item.timestamp}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

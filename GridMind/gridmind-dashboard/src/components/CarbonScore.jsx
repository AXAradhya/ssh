import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CarbonScore({ zones }) {
  if (!zones?.length) return null;

  const getGradeClass = (grade) => {
    if (grade.startsWith('A')) return 'grade-a';
    if (grade.startsWith('B')) return 'grade-b';
    if (grade.startsWith('C')) return 'grade-c';
    if (grade.startsWith('D')) return 'grade-d';
    return 'grade-f';
  };

  return (
    <div className="glass-card grid-col-5 animate-fade-in" style={{ animationDelay: '0.25s' }}>
      <div className="card-header">
        <span className="card-title"><Trophy /> Carbon Score Leaderboard</span>
        <span className="card-badge" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
          ZONE
        </span>
      </div>

      <div className="carbon-score-list">
        {zones.map((zone, i) => (
          <motion.div
            key={zone.zone}
            className="score-row"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <span className="score-rank">#{i + 1}</span>
            <span className="score-zone">{zone.zone}</span>
            <span className={`score-grade ${getGradeClass(zone.grade)}`}>
              {zone.grade}
            </span>
            <div className="score-bar-container">
              <motion.div
                className="score-bar"
                style={{ background: zone.color }}
                initial={{ width: 0 }}
                animate={{ width: `${zone.score}%` }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="score-percent">{zone.score}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

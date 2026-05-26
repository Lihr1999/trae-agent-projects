import { motion, AnimatePresence } from 'framer-motion';
import '../styles/SyncProgress.css';

interface SyncProgressProps {
  isSyncing: boolean;
  progress: number;
}

function SyncProgress({ isSyncing, progress }: SyncProgressProps) {
  return (
    <AnimatePresence>
      {isSyncing && (
        <motion.div
          className="sync-progress-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="sync-progress-header">
            <span className="sync-icon animate-spin">⚙️</span>
            <span className="sync-text">正在同步操作...</span>
            <span className="sync-percentage">{Math.round(progress)}%</span>
          </div>
          <div className="sync-progress-bar">
            <motion.div
              className="sync-progress-fill"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SyncProgress;

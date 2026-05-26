import { motion } from 'framer-motion';
import { PresetInfo } from '../types';
import '../styles/PresetButtons.css';

interface PresetButtonsProps {
  presets: PresetInfo[];
  onLoadPreset: (presetId: string) => void;
  onReset: () => void;
}

function PresetButtons({ presets, onLoadPreset, onReset }: PresetButtonsProps) {
  const buttonVariants = {
    hover: { scale: 1.05, y: -2 },
    tap: { scale: 0.98 },
  };

  const getIcon = (anomalyType: string | null) => {
    switch (anomalyType) {
      case 'tombstone-bloat':
        return '🪦';
      case 'out-of-order-jitter':
        return '🔀';
      case 'intention-violation':
        return '❌';
      case 'offline-reconnect':
        return '📡';
      default:
        return '📋';
    }
  };

  return (
    <div className="preset-buttons-container">
      <div className="preset-buttons">
        {presets.map((preset, index) => (
          <motion.button
            key={preset.id}
            className="preset-button"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onLoadPreset(preset.id)}
            title={preset.description}
          >
            <span className="preset-icon">{getIcon(preset.anomalyType)}</span>
            <span className="preset-name">{preset.name}</span>
          </motion.button>
        ))}
        <motion.button
          className="preset-button reset-button"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: presets.length * 0.1 }}
          onClick={onReset}
        >
          <span className="preset-icon">🔄</span>
          <span className="preset-name">重置文档</span>
        </motion.button>
      </div>
    </div>
  );
}

export default PresetButtons;

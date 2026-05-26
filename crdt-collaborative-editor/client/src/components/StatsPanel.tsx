import { motion } from 'framer-motion';
import { VersionVector } from '../types';
import '../styles/StatsPanel.css';

interface StatsPanelProps {
  tombstoneCount: number;
  totalNodeCount: number;
  versionVector: VersionVector;
  connectedClients: string[];
  textLength: number;
  activeAnomaly: string | null;
}

function StatsPanel({
  tombstoneCount,
  totalNodeCount,
  versionVector,
  connectedClients,
  textLength,
  activeAnomaly,
}: StatsPanelProps) {
  const bloatRatio = totalNodeCount > 0 ? (tombstoneCount / totalNodeCount) * 100 : 0;

  const getBloatColor = (ratio: number) => {
    if (ratio < 20) return '#10b981';
    if (ratio < 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <motion.div
      className="stats-panel"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <h3>📊 实时统计</h3>

      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">文本长度</span>
          <span className="stat-value">{textLength}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">总节点数</span>
          <span className="stat-value">{totalNodeCount}</span>
        </div>

        <div className="stat-item tombstone">
          <span className="stat-label">🪦 墓碑节点</span>
          <span className="stat-value">{tombstoneCount}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">在线用户</span>
          <span className="stat-value">{connectedClients.length}</span>
        </div>
      </div>

      <div className="bloat-meter">
        <div className="bloat-header">
          <span>墓碑膨胀率</span>
          <span style={{ color: getBloatColor(bloatRatio) }}>
            {bloatRatio.toFixed(1)}%
          </span>
        </div>
        <div className="bloat-bar">
          <motion.div
            className="bloat-fill"
            initial={{ width: 0 }}
            animate={{ width: `${bloatRatio}%` }}
            transition={{ duration: 0.5 }}
            style={{ backgroundColor: getBloatColor(bloatRatio) }}
          />
        </div>
      </div>

      <div className="version-vector">
        <h4>版本向量</h4>
        <div className="vector-items">
          {Object.entries(versionVector).map(([siteId, clock]) => (
            <motion.div
              key={siteId}
              className="vector-item"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <span className="site-id">{siteId.slice(0, 8)}</span>
              <span className="clock">{clock}</span>
            </motion.div>
          ))}
          {Object.keys(versionVector).length === 0 && (
            <span className="empty">暂无版本记录</span>
          )}
        </div>
      </div>

      {activeAnomaly && (
        <motion.div
          className="anomaly-info"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
        >
          <h4>⚠️ 当前异常模拟</h4>
          <div className="anomaly-description">
            {activeAnomaly === 'tombstone-bloat' && (
              <p>
                大量删除操作导致墓碑节点堆积。CRDT 为了保证并发一致性，被删除的节点
                不会立即物理删除，而是标记为墓碑。这会导致存储空间膨胀。
              </p>
            )}
            {activeAnomaly === 'out-of-order-jitter' && (
              <p>
                网络延迟导致操作乱序到达。CRDT 虽然能保证最终一致性，
                但中间状态可能出现文本抖动现象。
              </p>
            )}
            {activeAnomaly === 'intention-violation' && (
              <p>
                分支合并时可能出现意图违逆。两个用户在相同位置插入不同内容，
                CRDT 按 ID 排序合并，可能不符合用户预期。
              </p>
            )}
            {activeAnomaly === 'offline-reconnect' && (
              <p>
                离线用户重连后需要同步大量操作。在此期间可能出现数据不一致，
                直到所有操作同步完成。
              </p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default StatsPanel;

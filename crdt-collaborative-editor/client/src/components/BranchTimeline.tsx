import { motion } from 'framer-motion';
import { Branch } from '../types';
import '../styles/BranchTimeline.css';

interface BranchTimelineProps {
  branches: Branch[];
  onCreateBranch: () => void;
}

function BranchTimeline({ branches, onCreateBranch }: BranchTimelineProps) {
  const getBranchColor = (index: number) => {
    const colors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  };

  return (
    <motion.div
      className="branch-timeline"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="timeline-header">
        <h3>🌳 版本分支时间线</h3>
        <motion.button
          className="create-branch-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateBranch}
        >
          + 新建分支
        </motion.button>
      </div>

      <div className="branch-tree">
        {branches.length === 0 ? (
          <div className="empty-timeline">
            <span className="empty-icon">🌱</span>
            <p>暂无分支记录</p>
          </div>
        ) : (
          <div className="branch-list">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                className="branch-item"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="branch-line">
                  <div
                    className="branch-dot"
                    style={{ backgroundColor: getBranchColor(index) }}
                  />
                  {index < branches.length - 1 && (
                    <motion.div
                      className="branch-connector"
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      style={{ backgroundColor: getBranchColor(index) }}
                    />
                  )}
                </div>
                <div className="branch-info">
                  <div className="branch-name-row">
                    <span className="branch-name">{branch.name}</span>
                    {branch.mergedAt && (
                      <span className="merged-badge">已合并</span>
                    )}
                  </div>
                  <div className="branch-meta">
                    <span>
                      创建: {new Date(branch.createdAt).toLocaleTimeString()}
                    </span>
                    {branch.mergedAt && (
                      <span>
                        合并: {new Date(branch.mergedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {branch.parentBranchId && (
                    <div className="branch-parent">
                      父分支: {branch.parentBranchId.slice(0, 8)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default BranchTimeline;

import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

const DiffPanel: React.FC = () => {
  const computeDiff = useStore((s) => s.computeDiff);
  const diffResult = useStore((s) => s.diffResult);
  const isLoading = useStore((s) => s.isLoading);
  const error = useStore((s) => s.error);
  const language = useStore((s) => s.language);
  const setAnimationState = useStore((s) => s.setAnimationState);
  const showDiffPanel = useStore((s) => s.showDiffPanel);
  const toggleDiffPanel = useStore((s) => s.toggleDiffPanel);

  const [sourceA, setSourceA] = useState('');
  const [sourceB, setSourceB] = useState('');

  const handleComputeDiff = useCallback(async () => {
    if (!sourceA.trim() || !sourceB.trim()) return;
    await computeDiff(sourceA, sourceB);
  }, [sourceA, sourceB, computeDiff]);

  const handleVisualizeDiff = useCallback(() => {
    if (!diffResult) return;
    const affectedIds = diffResult.diffOperations
      .filter((op) => op.type !== 'match')
      .flatMap((op) => {
        const ids: string[] = [];
        if (op.nodeA) ids.push(op.nodeA.id);
        if (op.nodeB) ids.push(op.nodeB.id);
        return ids;
      });

    setAnimationState({
      type: 'morph',
      progress: 0,
      duration: 1500,
      startTime: Date.now(),
      affectedNodes: affectedIds,
    });
  }, [diffResult, setAnimationState]);

  if (!showDiffPanel) {
    return (
      <button
        onClick={toggleDiffPanel}
        style={{
          position: 'absolute',
          top: '12px',
          right: '120px',
          padding: '4px 12px',
          backgroundColor: '#1a1a2e',
          border: '1px solid #42a5f5',
          borderRadius: '4px',
          color: '#42a5f5',
          cursor: 'pointer',
          fontFamily: "'Consolas', monospace",
          fontSize: '11px',
          zIndex: 20,
        }}
      >
        Diff
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '380px',
        height: '100%',
        backgroundColor: 'rgba(13, 13, 26, 0.95)',
        borderLeft: '1px solid #333',
        color: '#e0e0e0',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #333',
          backgroundColor: '#0d0d1a',
        }}
      >
        <span style={{ fontWeight: 'bold' }}>AST Diff</span>
        <button
          onClick={toggleDiffPanel}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          \u2715
        </button>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'auto', flex: 1 }}>
        <div>
          <label style={{ color: '#4caf50', fontSize: '11px', marginBottom: '4px', display: 'block' }}>
            Source A
          </label>
          <textarea
            value={sourceA}
            onChange={(e) => setSourceA(e.target.value)}
            placeholder={`Paste ${language} code here...`}
            style={{
              width: '100%',
              height: '70px',
              backgroundColor: '#0d0d1a',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#e0e0e0',
              fontFamily: "'Consolas', monospace",
              fontSize: '11px',
              padding: '8px',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#f44336', fontSize: '11px', marginBottom: '4px', display: 'block' }}>
            Source B
          </label>
          <textarea
            value={sourceB}
            onChange={(e) => setSourceB(e.target.value)}
            placeholder={`Paste ${language} code here...`}
            style={{
              width: '100%',
              height: '70px',
              backgroundColor: '#0d0d1a',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#e0e0e0',
              fontFamily: "'Consolas', monospace",
              fontSize: '11px',
              padding: '8px',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleComputeDiff}
            disabled={isLoading || !sourceA.trim() || !sourceB.trim()}
            style={{
              flex: 1,
              padding: '6px 12px',
              backgroundColor: '#42a5f5',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: isLoading ? 'wait' : 'pointer',
              fontSize: '11px',
              opacity: isLoading || !sourceA.trim() || !sourceB.trim() ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Computing...' : 'Compute Diff'}
          </button>
          {diffResult && (
            <button
              onClick={handleVisualizeDiff}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: '#1a1a2e',
                border: '1px solid #4caf50',
                borderRadius: '4px',
                color: '#4caf50',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Visualize in 3D
            </button>
          )}
        </div>

        {error && (
          <div style={{ color: '#f44336', fontSize: '11px', padding: '4px 8px', backgroundColor: 'rgba(244,67,54,0.1)', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {diffResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Similarity:</span>
              <span
                style={{
                  color:
                    diffResult.similarity > 80
                      ? '#4caf50'
                      : diffResult.similarity > 50
                        ? '#ff9100'
                        : '#ff1744',
                }}
              >
                {Math.round(diffResult.similarity)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Edit Distance:</span>
              <span>{diffResult.editDistance}</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: 'rgba(76,175,80,0.15)',
                  border: '1px solid #4caf50',
                  borderRadius: '3px',
                  color: '#4caf50',
                  fontSize: '10px',
                }}
              >
                +{diffResult.addedNodes} added
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: 'rgba(244,67,54,0.15)',
                  border: '1px solid #f44336',
                  borderRadius: '3px',
                  color: '#f44336',
                  fontSize: '10px',
                }}
              >
                -{diffResult.deletedNodes} deleted
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: 'rgba(255,152,0,0.15)',
                  border: '1px solid #ff9100',
                  borderRadius: '3px',
                  color: '#ff9100',
                  fontSize: '10px',
                }}
              >
                ~{diffResult.modifiedNodes} modified
              </span>
            </div>

            {diffResult.diffOperations.length > 0 && (
              <div
                style={{
                  marginTop: '8px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  borderTop: '1px solid #333',
                  paddingTop: '8px',
                }}
              >
                {diffResult.diffOperations.map((op, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '10px',
                      padding: '2px 4px',
                      color:
                        op.type === 'insert'
                          ? '#4caf50'
                          : op.type === 'delete'
                            ? '#f44336'
                            : op.type === 'modify'
                              ? '#ff9100'
                              : '#666',
                    }}
                  >
                    {op.type === 'insert' ? '+' : op.type === 'delete' ? '-' : op.type === 'modify' ? '~' : ' '}
                    {' '}
                    {op.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffPanel;

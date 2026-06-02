import { Html } from '@react-three/drei';
import type { ASTNode } from '../../../../packages/shared/src';

interface NodeTooltipProps {
  node: ASTNode;
  position: [number, number, number];
}

const NodeTooltip: React.FC<NodeTooltipProps> = ({ node, position }) => {
  const truncatedText =
    node.text.length > 80 ? node.text.slice(0, 80) + '\u2026' : node.text;

  return (
    <Html
      position={position}
      center
      distanceFactor={15}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          backgroundColor: 'rgba(13, 13, 26, 0.95)',
          border: '1px solid #42a5f5',
          borderRadius: '6px',
          padding: '8px 12px',
          color: '#e0e0e0',
          fontFamily: "'Consolas', 'Monaco', monospace",
          fontSize: '12px',
          lineHeight: '1.4',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          minWidth: '120px',
          maxWidth: '320px',
        }}
      >
        <div
          style={{
            color: '#00e5ff',
            fontWeight: 'bold',
            marginBottom: '4px',
            fontSize: '13px',
          }}
        >
          {node.type}
        </div>
        <div
          style={{
            color: '#aaa',
            marginBottom: '4px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '60px',
            overflow: 'hidden',
          }}
        >
          {truncatedText}
        </div>
        <div
          style={{
            color: '#666',
            fontSize: '10px',
            borderTop: '1px solid #333',
            paddingTop: '4px',
          }}
        >
          [{node.startIndex} \u2013 {node.endIndex}]
        </div>
      </div>
    </Html>
  );
};

export default NodeTooltip;

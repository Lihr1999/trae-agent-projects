export default function FrozenOverlay({ message = '系统已冻结', onClose }) {
  return (
    <div className="frozen-overlay">
      <div className="frozen-content">
        <div className="frozen-title">❄️ 输入冻结</div>
        <div className="frozen-message">{message}</div>
        <button
          onClick={onClose}
          style={{
            marginTop: '20px',
            padding: '10px 24px',
            border: 'none',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
            color: '#fff',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          解除冻结
        </button>
      </div>
    </div>
  );
}

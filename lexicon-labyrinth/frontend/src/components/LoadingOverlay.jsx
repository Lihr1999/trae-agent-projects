export default function LoadingOverlay({ text = '加载中...' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner" />
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
}

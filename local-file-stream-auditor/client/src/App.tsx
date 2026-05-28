import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { api, createParseStream } from './api';
import {
  FieldRule,
  Anomaly,
  FieldStats,
  ParseChunkResult,
  PresetInfo,
  FileRecord,
  AuditReport,
} from './types';

const DEFAULT_RULES: FieldRule[] = [
  { field: 'id', type: 'number', required: true, unique: true },
  { field: 'name', type: 'string', required: true, unique: false },
  { field: 'email', type: 'string', required: false, unique: false, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
  { field: 'age', type: 'number', required: false, unique: false, min: 0, max: 150 },
  { field: 'department', type: 'string', required: false, unique: false },
  { field: 'notes', type: 'string', required: false, unique: false },
];

const ANOMALY_TYPES = [
  { key: 'all', label: '全部', color: '#667eea' },
  { key: 'field_missing', label: '字段缺失', color: '#fc8181' },
  { key: 'type_drift', label: '类型漂移', color: '#ed8936' },
  { key: 'duplicate_record', label: '重复记录', color: '#ecc94b' },
  { key: 'pattern_mismatch', label: '格式不匹配', color: '#4299e1' },
  { key: 'out_of_range', label: '超出范围', color: '#9f7aea' },
  { key: 'parse_error', label: '解析错误', color: '#f56565' },
];

const COLORS = ['#667eea', '#764ba2', '#48bb78', '#ed8936', '#f56565', '#4299e1', '#9f7aea'];

export default function App() {
  const [format, setFormat] = useState<'csv' | 'jsonl'>('csv');
  const [rules, setRules] = useState<FieldRule[]>(DEFAULT_RULES);
  const [activeTab, setActiveTab] = useState<'data' | 'anomalies' | 'visualization' | 'report'>('data');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all');
  const [blinkingRows, setBlinkingRows] = useState<Set<number>>(new Set());

  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [totalAnomalies, setTotalAnomalies] = useState(0);
  const [parsedRows, setParsedRows] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(0);

  const [allData, setAllData] = useState<any[]>([]);
  const [allAnomalies, setAllAnomalies] = useState<Anomaly[]>([]);
  const [fieldStats, setFieldStats] = useState<FieldStats[]>([]);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [history, setHistory] = useState<FileRecord[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadPresets();
    loadHistory();
  }, []);

  const loadPresets = async () => {
    try {
      const res = await api.getPresets();
      setPresets(res.data);
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getFiles();
      setHistory(res.data);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  const loadFileData = async (fileId: number) => {
    try {
      const [anomaliesRes, statsRes, reportRes] = await Promise.all([
        api.getAnomalies(fileId),
        api.getFieldStats(fileId),
        api.getReport(fileId),
      ]);

      const normalizedAnomalies = anomaliesRes.data.map((a) => ({
        ...a,
        anomalyType: a.anomalyType || a.anomaly_type || '',
        fieldName: a.fieldName || a.field_name || '',
        rowIndex: a.rowIndex,
      }));

      const normalizedStats = statsRes.data.map((s) => ({
        ...s,
        fieldName: s.fieldName || s.field_name || '',
        nullCount: s.nullCount ?? s.null_count ?? 0,
        uniqueCount: s.uniqueCount ?? s.unique_count ?? 0,
        totalCount: s.totalCount ?? s.total_count ?? 0,
      }));

      setAllAnomalies(normalizedAnomalies);
      setFieldStats(normalizedStats);
      setTotalAnomalies(normalizedAnomalies.length);
      setReport(reportRes.data ? {
        ...reportRes.data,
        totalRows: reportRes.data.totalRows ?? reportRes.data.total_rows ?? 0,
        totalAnomalies: reportRes.data.totalAnomalies ?? reportRes.data.total_anomalies ?? 0,
        anomalyTypes: reportRes.data.anomalyTypes || reportRes.data.anomaly_types || {},
        fieldSummary: reportRes.data.fieldSummary || reportRes.data.field_summary || [],
      } : null);
      setCurrentFileId(fileId);

      const fileInfo = history.find((f) => f.id === fileId);
      if (fileInfo) {
        setTotalRows(fileInfo.row_count || 0);
        setParsedRows(fileInfo.row_count || 0);
        setParseProgress(100);
      }
    } catch (e) {
      console.error('Failed to load file data:', e);
    }
  };

  const handleChunk = useCallback((chunk: ParseChunkResult) => {
    setAllData((prev) => [...prev, ...chunk.data]);
    setAllAnomalies((prev) => [...prev, ...chunk.anomalies]);
    setFieldStats(chunk.fieldStats);

    const newParsedRows = chunk.endRow + 1;
    setParsedRows(newParsedRows);
    setTotalAnomalies((prev) => prev + chunk.anomalies.length);

    if (estimatedTotal > 0) {
      const progress = Math.min((newParsedRows / estimatedTotal) * 100, 99);
      setParseProgress(progress);
    }

    if (chunk.anomalies.length > 0) {
      const anomalyRowIndices = new Set(chunk.anomalies.map((a) => a.rowIndex));
      setBlinkingRows(anomalyRowIndices);
      setTimeout(() => setBlinkingRows(new Set()), 3000);
    }
  }, [estimatedTotal]);

  const handleParseComplete = useCallback(() => {
    setIsParsing(false);
    setParseProgress(100);
    setShowLoading(false);
    loadHistory();
  }, []);

  const handleParseError = useCallback((error: string) => {
    setIsParsing(false);
    setShowLoading(false);
    alert(`解析错误: ${error}`);
  }, []);

  const startParseStream = (streamId: string) => {
    if (closeStreamRef.current) {
      closeStreamRef.current();
    }
    closeStreamRef.current = createParseStream(streamId, {
      onChunk: handleChunk,
      onComplete: handleParseComplete,
      onError: handleParseError,
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsParsing(true);
    setShowLoading(true);
    setLoadingText('正在上传并解析文件...');
    setAllData([]);
    setAllAnomalies([]);
    setFieldStats([]);
    setReport(null);
    setParsedRows(0);
    setTotalAnomalies(0);
    setParseProgress(0);

    const fileSize = file.size;
    const estimatedRows = Math.floor(fileSize / 50);
    setEstimatedTotal(estimatedRows);
    setTotalRows(estimatedRows);

    try {
      const res = await api.uploadFile(file, rules, format);
      setCurrentFileId(null);
      startParseStream(res.data.streamId);
    } catch (e) {
      setIsParsing(false);
      setShowLoading(false);
      alert('文件上传失败');
    }
  };

  const handlePresetClick = async (presetType: PresetInfo['type']) => {
    const preset = presets.find((p) => p.type === presetType);
    if (!preset) return;

    setIsParsing(true);
    setShowLoading(true);
    setLoadingText(`正在生成"${preset.name}"测试数据...`);
    setAllData([]);
    setAllAnomalies([]);
    setFieldStats([]);
    setReport(null);
    setParsedRows(0);
    setTotalAnomalies(0);
    setParseProgress(0);
    setEstimatedTotal(preset.estimatedRows);
    setTotalRows(preset.estimatedRows);

    try {
      const res = await api.loadPreset(presetType, rules);
      setCurrentFileId(null);
      startParseStream(res.data.streamId);
    } catch (e) {
      setIsParsing(false);
      setShowLoading(false);
      alert('加载预设场景失败');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const addRule = () => {
    setRules([...rules, { field: '', type: 'string', required: false, unique: false }]);
  };

  const updateRule = (index: number, field: keyof FieldRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    if (rules.length > 1) {
      setRules(rules.filter((_, i) => i !== index));
    }
  };

  const generateReport = async () => {
    if (!currentFileId && allData.length === 0) return;

    setIsGeneratingReport(true);
    setShowLoading(true);
    setLoadingText('正在生成审计报告...');

    try {
      let fileId = currentFileId;
      if (!fileId && allData.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await loadHistory();
        const latest = history[0];
        if (latest) {
          fileId = latest.id;
        }
      }

      if (fileId) {
        const res = await api.generateReport(fileId);
        const normalizedReport: AuditReport = {
          ...res.data,
          totalRows: res.data.totalRows ?? res.data.total_rows ?? 0,
          totalAnomalies: res.data.totalAnomalies ?? res.data.total_anomalies ?? 0,
          anomalyTypes: res.data.anomalyTypes || res.data.anomaly_types || {},
          fieldSummary: res.data.fieldSummary || res.data.field_summary || [],
        };
        setReport(normalizedReport);
      }
    } catch (e) {
      console.error('Failed to generate report:', e);
      alert('生成报告失败');
    } finally {
      setIsGeneratingReport(false);
      setShowLoading(false);
    }
  };

  const filteredAnomalies = anomalyFilter === 'all'
    ? allAnomalies
    : allAnomalies.filter((a) => a.anomalyType === anomalyFilter);

  const anomalyTypeStats = ANOMALY_TYPES.slice(1).map((type) => ({
    name: type.label,
    value: allAnomalies.filter((a) => a.anomalyType === type.key).length,
    color: type.color,
  })).filter((t) => t.value > 0);

  const fieldDistributionData = fieldStats.map((fs) => ({
    field: fs.fieldName,
    空值: fs.nullCount,
    有效值: fs.totalCount - fs.nullCount,
  }));

  const getAnomalyTypeLabel = (type: string) => {
    const found = ANOMALY_TYPES.find((t) => t.key === type);
    return found ? found.label : type;
  };

  const getDataColumns = () => {
    if (allData.length === 0) return [];
    return Object.keys(allData[0]);
  };

  return (
    <div className="app-container">
      {showLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <div className="loading-text">{loadingText}</div>
          </div>
        </div>
      )}

      <header className="app-header">
        <h1>📊 本地文件流审计器</h1>
        <p>CSV/JSONL 文件结构化审计系统 · 实时解析 · 异常检测 · 可视化分析</p>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="card">
            <h2>📁 文件上传</h2>
            <div className="upload-section">
              <div
                className={`upload-area ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.jsonl,.json"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <div className="upload-icon">📤</div>
                <div className="upload-text">
                  点击或拖拽文件到此处
                  <br />
                  <small>支持 CSV, JSONL 格式</small>
                </div>
              </div>

              <div className="format-selector">
                <button
                  className={`format-btn ${format === 'csv' ? 'active' : ''}`}
                  onClick={() => setFormat('csv')}
                >
                  CSV
                </button>
                <button
                  className={`format-btn ${format === 'jsonl' ? 'active' : ''}`}
                  onClick={() => setFormat('jsonl')}
                >
                  JSONL
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>🎯 预设测试场景</h2>
            <div className="preset-buttons">
              {presets.map((preset) => (
                <button
                  key={preset.type}
                  className="preset-btn"
                  onClick={() => handlePresetClick(preset.type)}
                  disabled={isParsing}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-desc">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>⚙️ 字段规则配置</h2>
            <div className="rules-config">
              {rules.map((rule, index) => (
                <div key={`${rule.field}-${index}`} className="rule-item">
                  <input
                    type="text"
                    placeholder="字段名"
                    value={rule.field}
                    onChange={(e) => updateRule(index, 'field', e.target.value)}
                  />
                  <select
                    value={rule.type}
                    onChange={(e) => updateRule(index, 'type', e.target.value)}
                  >
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                    <option value="date">日期</option>
                  </select>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!rule.required}
                      onChange={(e) => updateRule(index, 'required', e.target.checked)}
                    />
                    必填
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!rule.unique}
                      onChange={(e) => updateRule(index, 'unique', e.target.checked)}
                    />
                    唯一
                  </label>
                  <button
                    onClick={() => removeRule(index)}
                    style={{
                      background: '#fc8181',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
              <button className="add-rule-btn" onClick={addRule}>
                + 添加规则
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="card history-section">
              <h2>📜 历史记录</h2>
              {history.slice(0, 5).map((file) => (
                <div
                  key={file.id}
                  className="history-item"
                  onClick={() => loadFileData(file.id)}
                >
                  <div className="history-name">{file.original_name}</div>
                  <div className="history-meta">
                    {file.row_count} 行 · {(file.file_size / 1024).toFixed(1)} KB ·
                    <span className={`status-badge ${file.status}`}>
                      {file.status === 'completed' ? '已完成' : file.status === 'processing' ? '处理中' : '错误'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="content-area">
          {(isParsing || parsedRows > 0) && (
            <div className="progress-section">
              <div className="progress-bar-container">
                <div
                  className={`progress-bar ${isParsing ? 'chunk-animated' : ''}`}
                  style={{ width: `${parseProgress}%` }}
                />
              </div>
              <div className="progress-info">
                <span>
                  {isParsing ? '⏳ 正在解析...' : '✅ 解析完成'} · 已处理 {parsedRows} 行
                </span>
                <span>{parseProgress.toFixed(1)}%</span>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{parsedRows.toLocaleString()}</div>
                  <div className="stat-label">总行数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: totalAnomalies > 0 ? '#f56565' : '#48bb78' }}>
                    {totalAnomalies.toLocaleString()}
                  </div>
                  <div className="stat-label">异常数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{fieldStats.length}</div>
                  <div className="stat-label">字段数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {totalAnomalies > 0 ? ((totalAnomalies / parsedRows) * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="stat-label">异常率</div>
                </div>
              </div>
            </div>
          )}

          {parsedRows > 0 ? (
            <>
              <div className="data-tabs">
                <button
                  className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
                  onClick={() => setActiveTab('data')}
                >
                  📋 数据预览
                </button>
                <button
                  className={`tab-btn ${activeTab === 'anomalies' ? 'active' : ''}`}
                  onClick={() => setActiveTab('anomalies')}
                >
                  ⚠️ 异常记录 ({allAnomalies.length})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'visualization' ? 'active' : ''}`}
                  onClick={() => setActiveTab('visualization')}
                >
                  📊 可视化分析
                </button>
                <button
                  className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
                  onClick={() => setActiveTab('report')}
                >
                  📑 审计报告
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'data' && (
                  <div>
                    {allData.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              {getDataColumns().map((col) => (
                                <th key={col}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {allData.slice(0, 100).map((row, idx) => {
                              const rowIndex = idx;
                              const hasAnomaly = allAnomalies.some((a) => a.rowIndex === rowIndex);
                              const isBlinking = blinkingRows.has(rowIndex);
                              return (
                                <tr
                                  key={idx}
                                  className={`${hasAnomaly ? 'anomaly-row' : ''} ${isBlinking ? 'anomaly-row-blink' : ''}`}
                                >
                                  <td>{rowIndex}</td>
                                  {getDataColumns().map((col) => (
                                    <td key={col}>{String(row[col] ?? '')}</td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {allData.length > 100 && (
                          <div style={{ textAlign: 'center', padding: '15px', color: '#718096' }}>
                            显示前 100 行，共 {allData.length} 行数据
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <div>暂无数据，请上传文件或选择预设场景</div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'anomalies' && (
                  <div>
                    <div className="filter-section">
                      {ANOMALY_TYPES.map((type) => (
                        <button
                          key={type.key}
                          className={`filter-btn ${anomalyFilter === type.key ? 'active' : ''}`}
                          onClick={() => setAnomalyFilter(type.key)}
                        >
                          {type.label}
                          {type.key !== 'all' && ` (${allAnomalies.filter((a) => a.anomalyType === type.key).length})`}
                        </button>
                      ))}
                    </div>

                    {filteredAnomalies.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>行号</th>
                              <th>异常类型</th>
                              <th>字段</th>
                              <th>期望值</th>
                              <th>实际值</th>
                              <th>详情</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAnomalies.map((anomaly, idx) => (
                              <tr
                                key={idx}
                                className={`anomaly-row ${blinkingRows.has(anomaly.rowIndex) ? 'anomaly-row-blink' : ''}`}
                              >
                                <td>{anomaly.rowIndex}</td>
                                <td>
                                  <span className={`anomaly-badge ${anomaly.anomalyType}`}>
                                    {getAnomalyTypeLabel(anomaly.anomalyType)}
                                  </span>
                                </td>
                                <td>{anomaly.fieldName}</td>
                                <td>{anomaly.expected || '-'}</td>
                                <td>{anomaly.actual || '-'}</td>
                                <td>{anomaly.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-state-icon">✅</div>
                        <div>未检测到异常记录</div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'visualization' && (
                  <div>
                    <div className="charts-container">
                      <div className="chart-card">
                        <h3>📈 字段空值分布</h3>
                        {fieldStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={fieldDistributionData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="field" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="有效值" fill="#667eea" className="bar-chart-bar" />
                              <Bar dataKey="空值" fill="#fc8181" className="bar-chart-bar" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="empty-state">
                            <div className="empty-state-icon">📊</div>
                            <div>暂无统计数据</div>
                          </div>
                        )}
                      </div>

                      <div className="chart-card">
                        <h3>🥧 异常类型分布</h3>
                        {anomalyTypeStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={anomalyTypeStats}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {anomalyTypeStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="empty-state">
                            <div className="empty-state-icon">✅</div>
                            <div>暂无异常数据</div>
                          </div>
                        )}
                      </div>

                      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                        <h3>📉 字段完整度统计</h3>
                        {fieldStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart
                              data={fieldStats.map((fs) => ({
                                field: fs.fieldName,
                                完整度: Math.round(((fs.totalCount - fs.nullCount) / fs.totalCount) * 100),
                              }))}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 100]} />
                              <YAxis type="category" dataKey="field" />
                              <Tooltip formatter={(value) => `${value}%`} />
                              <Bar dataKey="完整度" fill="#48bb78" className="bar-chart-bar">
                                {fieldStats.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="empty-state">
                            <div className="empty-state-icon">📊</div>
                            <div>暂无统计数据</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'report' && (
                  <div className="report-section">
                    <button
                      className="generate-report-btn"
                      onClick={generateReport}
                      disabled={isGeneratingReport || isParsing}
                    >
                      {isGeneratingReport ? '⏳ 生成中...' : '📄 生成审计报告'}
                    </button>

                    {report ? (
                      <div>
                        <h3 style={{ margin: '20px 0 15px', color: '#4a5568' }}>
                          📊 审计报告摘要
                        </h3>
                        <div className="report-summary">
                          <div className="report-item">
                            <div className="report-value">{report.totalRows.toLocaleString()}</div>
                            <div className="report-label">总行数</div>
                          </div>
                          <div className="report-item">
                            <div className="report-value" style={{ color: '#f56565' }}>
                              {report.totalAnomalies.toLocaleString()}
                            </div>
                            <div className="report-label">异常总数</div>
                          </div>
                          <div className="report-item">
                            <div className="report-value" style={{ color: '#ed8936' }}>
                              {Object.keys(report.anomalyTypes).length}
                            </div>
                            <div className="report-label">异常类型数</div>
                          </div>
                          <div className="report-item">
                            <div className="report-value" style={{ color: '#48bb78' }}>
                              {((1 - report.totalAnomalies / report.totalRows) * 100).toFixed(1)}%
                            </div>
                            <div className="report-label">数据合格率</div>
                          </div>
                        </div>

                        <h3 style={{ margin: '30px 0 15px', color: '#4a5568' }}>
                          ⚠️ 异常类型分布
                        </h3>
                        <div className="charts-container">
                          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart
                                data={Object.entries(report.anomalyTypes).map(([key, value]) => ({
                                  type: getAnomalyTypeLabel(key),
                                  count: value,
                                }))}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="type" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f56565" className="bar-chart-bar">
                                  {Object.entries(report.anomalyTypes).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <h3 style={{ margin: '30px 0 15px', color: '#4a5568' }}>
                          📋 字段质量摘要
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>字段名</th>
                                <th>类型</th>
                                <th>空值率</th>
                                <th>唯一值率</th>
                                <th>质量评估</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.fieldSummary.map((fs, idx) => (
                                <tr key={idx}>
                                  <td>{fs.fieldName}</td>
                                  <td>{fs.type}</td>
                                  <td>{fs.nullRate.toFixed(2)}%</td>
                                  <td>{fs.uniqueRate.toFixed(2)}%</td>
                                  <td>
                                    {fs.nullRate < 5 ? (
                                      <span className="anomaly-badge" style={{ background: '#c6f6d5', color: '#22543d' }}>
                                        优秀
                                      </span>
                                    ) : fs.nullRate < 20 ? (
                                      <span className="anomaly-badge" style={{ background: '#fefcbf', color: '#975a16' }}>
                                        良好
                                      </span>
                                    ) : (
                                      <span className="anomaly-badge field_missing">
                                        需关注
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <div>点击上方按钮生成审计报告</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h2 style={{ marginBottom: '15px', color: '#4a5568' }}>欢迎使用本地文件流审计器</h2>
                <p style={{ color: '#718096', maxWidth: '500px', margin: '0 auto' }}>
                  请上传 CSV 或 JSONL 格式的文件，或点击左侧预设场景按钮开始测试。
                  系统支持实时分块解析、异常检测、可视化分析及审计报告生成。
                </p>
                <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div className="stat-card">
                    <div className="stat-value">📁</div>
                    <div className="stat-label">支持 CSV/JSONL</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">⚡</div>
                    <div className="stat-label">流式分块解析</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">🔍</div>
                    <div className="stat-label">智能异常检测</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">📊</div>
                    <div className="stat-label">可视化分析</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

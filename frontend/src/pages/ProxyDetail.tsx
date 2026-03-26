import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Loader, Label, Alert } from '@gravity-ui/uikit';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  getNode,
  getProxyStats,
  getProxyLink,
  getProxyStatsHistory,
  getProxyIpHistory,
  getNodeBlacklist,
  pauseProxy,
  unpauseProxy,
  NodeData,
  ProxyStatsData,
  ConnectedIpInfo,
  StatsSnapshotData,
  IpHistoryEntryData,
} from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function FlagIcon({ code, size = 20 }: { code?: string; size?: number }) {
  if (!code || code.length !== 2) return null;
  const h = Math.round(size * 0.75);
  return <img src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`} alt={code} style={{ verticalAlign: 'middle', marginRight: 3 }} width={size} height={h} />;
}

export default function ProxyDetail() {
  const { nodeId: nodeIdStr, proxyId } = useParams<{ nodeId: string; proxyId: string }>();
  const navigate = useNavigate();
  const nodeId = parseInt(nodeIdStr || '0', 10);

  const [node, setNode] = useState<NodeData | null>(null);
  const [stats, setStats] = useState<ProxyStatsData | null>(null);
  const [statsHistory, setStatsHistory] = useState<StatsSnapshotData[]>([]);
  const [ipHistory, setIpHistory] = useState<IpHistoryEntryData[]>([]);
  const [blacklist, setBlacklist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [nodeGeo, setNodeGeo] = useState('');

  const loadStats = useCallback(async () => {
    if (!proxyId) return;
    try {
      const data = await getProxyStats(nodeId, proxyId);
      setStats(data);
    } catch {}
  }, [nodeId, proxyId]);

  const loadAll = useCallback(async () => {
    if (!proxyId) return;
    try {
      const [nodeData, statsData, history, ips, bl] = await Promise.all([
        getNode(nodeId),
        getProxyStats(nodeId, proxyId),
        getProxyStatsHistory(nodeId, proxyId),
        getProxyIpHistory(nodeId, proxyId),
        getNodeBlacklist(nodeId),
      ]);
      setNode(nodeData);
      setStats(statsData);
      setStatsHistory(history);
      setIpHistory(ips);
      setBlacklist(new Set(bl));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [nodeId, proxyId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Lookup node geo
  useEffect(() => {
    if (node?.ip) {
      fetch(`http://ip-api.com/json/${node.ip}?fields=countryCode`)
        .then((r) => r.json())
        .then((d: any) => { if (d.countryCode) setNodeGeo(d.countryCode); })
        .catch(() => {});
    }
  }, [node?.ip]);

  // Poll live stats every 10s
  useEffect(() => {
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Refresh history every 5min
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!proxyId) return;
      try {
        const [history, ips] = await Promise.all([
          getProxyStatsHistory(nodeId, proxyId),
          getProxyIpHistory(nodeId, proxyId),
        ]);
        setStatsHistory(history);
        setIpHistory(ips);
      } catch {}
    }, 300000);
    return () => clearInterval(interval);
  }, [nodeId, proxyId]);

  const handleCopyLink = async () => {
    if (!proxyId) return;
    try {
      const link = await getProxyLink(nodeId, proxyId);
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTogglePause = async () => {
    if (!proxyId || !stats) return;
    setTogglingPause(true);
    try {
      if (stats.status === 'paused') {
        await unpauseProxy(nodeId, proxyId);
      } else {
        await pauseProxy(nodeId, proxyId);
      }
      await loadStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingPause(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Loader size="l" />
      </div>
    );
  }

  // Current connected IPs set for determining badge color
  const connectedIpSet = new Set(stats?.connectedIps?.map((c: ConnectedIpInfo) => c.ip) || []);

  const statusTheme = stats?.status === 'running' ? 'success' : stats?.status === 'paused' ? 'warning' : 'danger';
  const statusLabel = stats?.status === 'running' ? 'работает' : stats?.status === 'paused' ? 'пауза' : stats?.status === 'stopped' ? 'остановлен' : 'ошибка';

  // Chart data
  const chartLabels = statsHistory.map((s) =>
    new Date(s.timestamp).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
  );
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 12 } },
    },
  };

  const connectionsChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Подключения',
        data: statsHistory.map((s) => s.connectedCount),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const trafficChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Вход (MB)',
        data: statsHistory.map((s) => +(s.networkRxBytes / 1048576).toFixed(2)),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Исход (MB)',
        data: statsHistory.map((s) => +(s.networkTxBytes / 1048576).toFixed(2)),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const cpuMemChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'CPU %',
        data: statsHistory.map((s) => s.cpuPercent),
        borderColor: 'rgb(255, 159, 64)',
        tension: 0.3,
      },
      {
        label: 'Память (MB)',
        data: statsHistory.map((s) => +(s.memoryBytes / 1048576).toFixed(2)),
        borderColor: 'rgb(153, 102, 255)',
        tension: 0.3,
      },
    ],
  };

  // Sort IP history: connected first, then blacklisted, then disconnected, all by lastSeen desc
  const sortedIpHistory = [...ipHistory].sort((a, b) => {
    const aConn = connectedIpSet.has(a.ip) ? 0 : blacklist.has(a.ip) ? 2 : 1;
    const bConn = connectedIpSet.has(b.ip) ? 0 : blacklist.has(b.ip) ? 2 : 1;
    if (aConn !== bConn) return aConn - bConn;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  return (
    <>
      <div className="node-detail-header">
        <Button view="flat" onClick={() => navigate(`/nodes/${nodeId}`)}>
          ← Назад
        </Button>
        {stats && (
          <>
            <h2 style={{ margin: 0 }}>{stats.id}</h2>
            <Label theme={statusTheme} size="s">{statusLabel}</Label>
          </>
        )}
        {node && (
          <Label theme="info" size="s">
            {nodeGeo && <FlagIcon code={nodeGeo} />}{node.name} ({node.ip})
          </Label>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert theme="danger" message={error} onClose={() => setError('')} />
        </div>
      )}

      {/* Live stats */}
      {stats && (
        <Card view="outlined" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px' }}>Статистика в реальном времени</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.cpuPercent}</div>
              <div className="stat-label">CPU</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.memoryUsage}</div>
              <div className="stat-label">Память</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.networkRx}</div>
              <div className="stat-label">Вход</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.networkTx}</div>
              <div className="stat-label">Исход</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.uptime}</div>
              <div className="stat-label">Аптайм</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.connectedIps?.length || 0}</div>
              <div className="stat-label">IP</div>
            </div>
          </div>

          {stats.connectedIps && stats.connectedIps.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--g-color-text-secondary)', marginBottom: 4 }}>Сейчас подключены:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {stats.connectedIps.map((info: ConnectedIpInfo) => (
                  <Label key={info.ip} size="xs" theme="success">
                    {info.countryCode && <FlagIcon code={info.countryCode} size={16} />}{info.ip}
                  </Label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button view="action" size="s" onClick={handleCopyLink}>
              {copied ? '✓ Скопировано!' : 'Копировать ссылку'}
            </Button>
            {(stats.status === 'running' || stats.status === 'paused') && (
              <Button view="outlined" size="s" onClick={handleTogglePause} loading={togglingPause}>
                {stats.status === 'paused' ? 'Запустить' : 'Пауза'}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Stats history charts */}
      {statsHistory.length > 1 && (
        <Card view="outlined" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px' }}>История</h3>
          <div className="charts-grid">
            <div className="chart-container">
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--g-color-text-secondary)' }}>Подключения</h4>
              <div style={{ height: 200 }}>
                <Line data={connectionsChartData} options={chartOptions} />
              </div>
            </div>
            <div className="chart-container">
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--g-color-text-secondary)' }}>Трафик</h4>
              <div style={{ height: 200 }}>
                <Line data={trafficChartData} options={chartOptions} />
              </div>
            </div>
            <div className="chart-container">
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--g-color-text-secondary)' }}>CPU / Память</h4>
              <div style={{ height: 200 }}>
                <Line data={cpuMemChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* IP History */}
      {sortedIpHistory.length > 0 && (
        <Card view="outlined" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px' }}>История IP ({sortedIpHistory.length})</h3>
          <div className="ip-history-list">
            {sortedIpHistory.map((entry) => {
              const isConnected = connectedIpSet.has(entry.ip);
              const isBlacklisted = blacklist.has(entry.ip);
              const theme = isConnected ? 'success' : isBlacklisted ? 'danger' : 'info';
              const tooltipText = [
                entry.country ? `Страна: ${entry.country}` : '',
                `Первое подключение: ${new Date(entry.firstSeen).toLocaleString('ru-RU')}`,
                `Последнее: ${new Date(entry.lastSeen).toLocaleString('ru-RU')}`,
                isBlacklisted ? '⛔ В чёрном списке' : '',
              ].filter(Boolean).join('\n');

              return (
                <div key={entry.ip} className="ip-history-item" title={tooltipText}>
                  <Label theme={theme} size="s">
                    {entry.countryCode && <FlagIcon code={entry.countryCode} size={16} />}{entry.ip}
                  </Label>
                  <span className="ip-history-date">
                    {new Date(entry.lastSeen).toLocaleString('ru-RU')}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--g-color-text-secondary)', display: 'flex', gap: 12 }}>
            <span><Label theme="success" size="xs">●</Label> подключён</span>
            <span><Label theme="info" size="xs">●</Label> отключён</span>
            <span><Label theme="danger" size="xs">●</Label> заблокирован</span>
          </div>
        </Card>
      )}
    </>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Loader, Label, Alert, Tooltip } from '@gravity-ui/uikit';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { ru } from 'date-fns/locale';
import {
  Chart as ChartJS,
  TimeScale,
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
  clearProxyHistory,
  pauseProxy,
  unpauseProxy,
  NodeData,
  ProxyStatsData,
  ConnectedIpInfo,
  StatsSnapshotData,
  IpHistoryEntryData,
} from '../api';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler, zoomPlugin);

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
  const [clearing, setClearing] = useState(false);
  const [nodeGeo, setNodeGeo] = useState('');
  const chartRef = useRef<any>(null);

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

  const handleClearHistory = async () => {
    if (!proxyId) return;
    setClearing(true);
    try {
      await clearProxyHistory(nodeId, proxyId);
      setStatsHistory([]);
      setIpHistory([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClearing(false);
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

  // Chart data — use {x, y} points with Date objects for TimeScale
  const toPoint = (s: StatsSnapshotData, value: number) => ({ x: new Date(s.timestamp), y: value });

  const combinedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: { mode: 'index' as const, intersect: false },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x' as const,
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x' as const,
        },
        limits: {
          x: { minRange: 10 * 60 * 1000 },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          tooltipFormat: 'dd.MM HH:mm',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'dd.MM HH:mm',
          },
        },
        adapters: { date: { locale: ru } },
        ticks: { maxTicksLimit: 12 },
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: 'Подключения / CPU %' },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: { display: true, text: 'МБ' },
        grid: { drawOnChartArea: false },
      },
    },
  };

  const combinedChartData = {
    datasets: [
      {
        label: 'Подключения',
        data: statsHistory.map((s) => toPoint(s, s.connectedCount)),
        yAxisID: 'y',
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: false,
        pointRadius: 1,
        tension: 0.3,
      },
      {
        label: 'CPU %',
        data: statsHistory.map((s) => toPoint(s, s.cpuPercent)),
        yAxisID: 'y',
        borderColor: 'rgb(255, 159, 64)',
        fill: false,
        pointRadius: 1,
        tension: 0.3,
      },
      {
        label: 'Вход (MB)',
        data: statsHistory.map((s) => toPoint(s, +(s.networkRxBytes / 1048576).toFixed(2))),
        yAxisID: 'y1',
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: false,
        pointRadius: 1,
        tension: 0.3,
      },
      {
        label: 'Исход (MB)',
        data: statsHistory.map((s) => toPoint(s, +(s.networkTxBytes / 1048576).toFixed(2))),
        yAxisID: 'y1',
        borderColor: 'rgb(255, 99, 132)',
        fill: false,
        pointRadius: 1,
        tension: 0.3,
      },
      {
        label: 'Память (MB)',
        data: statsHistory.map((s) => toPoint(s, +(s.memoryBytes / 1048576).toFixed(2))),
        yAxisID: 'y1',
        borderColor: 'rgb(153, 102, 255)',
        fill: false,
        pointRadius: 1,
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

      {/* Stats history chart */}
      {statsHistory.length > 1 && (
        <Card view="outlined" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Статистика</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="xs" view="outlined" onClick={() => chartRef.current?.resetZoom()}>
                Сбросить зум
              </Button>
              <Button size="xs" view="outlined-danger" onClick={handleClearHistory} loading={clearing}>
                Очистить историю
              </Button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--g-color-text-secondary)', marginBottom: 8 }}>
            Колёсико мыши — приближение, зажатая ЛКМ — прокрутка. Клик по легенде — скрыть/показать линию.
          </div>
          <div style={{ height: 350 }}>
            <Line ref={chartRef} data={combinedChartData} options={combinedChartOptions} />
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
              const tooltipContent = (
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  {entry.country && <div>Страна: {entry.country}</div>}
                  <div>Первое подключение: {new Date(entry.firstSeen).toLocaleString('ru-RU')}</div>
                  <div>Последнее: {new Date(entry.lastSeen).toLocaleString('ru-RU')}</div>
                  {isBlacklisted && <div style={{ color: 'var(--g-color-text-danger)' }}>⛔ В чёрном списке</div>}
                </div>
              );

              return (
                <Tooltip key={entry.ip} content={tooltipContent} placement="top" openDelay={300}>
                  <div className="ip-history-item" tabIndex={0}>
                    <Label theme={theme} size="s">
                      {entry.countryCode && <FlagIcon code={entry.countryCode} size={16} />}{entry.ip}
                    </Label>
                  </div>
                </Tooltip>
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

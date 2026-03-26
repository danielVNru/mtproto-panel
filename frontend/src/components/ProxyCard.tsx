import { useState, useEffect } from 'react';
import { Card, Button, Label, Icon, DropdownMenu } from '@gravity-ui/uikit';
import { ChevronDown, ChevronRight } from '@gravity-ui/icons';
import { getProxyStats, pauseProxy, unpauseProxy, ProxyData, ProxyStatsData, ConnectedIpInfo } from '../api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function countryFlag(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const offset = 0x1f1e6;
  const a = countryCode.toUpperCase().charCodeAt(0) - 65 + offset;
  const b = countryCode.toUpperCase().charCodeAt(1) - 65 + offset;
  return String.fromCodePoint(a, b);
}

interface Props {
  proxy: ProxyData;
  nodeId: number;
  nodeName?: string;
  copied: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onStatusChange?: () => void;
}

export default function ProxyCard({ proxy, nodeId, nodeName, copied, onEdit, onDelete, onCopyLink, onStatusChange }: Props) {
  const [stats, setStats] = useState<ProxyStatsData | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getProxyStats(nodeId, proxy.id);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (showStats) {
      loadStats();
      const interval = setInterval(loadStats, 10000);
      return () => clearInterval(interval);
    }
  }, [showStats]);

  const statusTheme = proxy.status === 'running' ? 'success' : proxy.status === 'stopped' || proxy.status === 'paused' ? 'warning' : 'danger';
  const statusLabel = proxy.status === 'running' ? 'работает' : proxy.status === 'paused' ? 'пауза' : proxy.status === 'stopped' ? 'остановлен' : 'ошибка';

  const handleTogglePause = async () => {
    setTogglingPause(true);
    try {
      if (proxy.status === 'paused') {
        await unpauseProxy(nodeId, proxy.id);
      } else {
        await pauseProxy(nodeId, proxy.id);
      }
      onStatusChange?.();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    } finally {
      setTogglingPause(false);
    }
  };

  const handleStatsToggle = () => {
    const next = !showStats;
    setShowStats(next);
    if (next && !stats) loadStats();
  };

  const menuItems = [
    { text: 'Редактировать', action: () => onEdit() },
    ...(proxy.status === 'running' || proxy.status === 'paused'
      ? [{
          text: proxy.status === 'paused' ? 'Запустить' : 'Пауза',
          action: () => handleTogglePause(),
        }]
      : []),
    { text: 'Удалить', action: () => onDelete(), theme: 'danger' as const },
  ];

  return (
    <Card view="outlined" style={{ padding: 20 }}>
      <div className="proxy-card-header">
        <span style={{ fontWeight: 600, fontSize: 15 }}>{proxy.name || `Proxy ${proxy.id}`}</span>
        <Label theme={statusTheme} size="s">
          {statusLabel}
        </Label>
      </div>

      {proxy.note && (
        <div style={{ fontSize: 13, color: 'var(--g-color-text-secondary)', marginBottom: 8 }}>
          {proxy.note}
        </div>
      )}

      {nodeName && (
        <div className="proxy-card-field">
          <span className="label">Нода</span>
          <span>{nodeName}</span>
        </div>
      )}
      <div className="proxy-card-field">
        <span className="label">Домен</span>
        <span>{proxy.domain}</span>
      </div>
      <div className="proxy-card-field">
        <span className="label">Создано</span>
        <span>{new Date(proxy.createdAt).toLocaleString()}</span>
      </div>
      {proxy.tag && (
        <div className="proxy-card-field">
          <span className="label">Тег</span>
          <span>{proxy.tag}</span>
        </div>
      )}
      <div className="proxy-card-field">
        <span className="label">Трафик ↑</span>
        <span>{formatBytes(proxy.trafficUp || 0)}</span>
      </div>
      <div className="proxy-card-field">
        <span className="label">Трафик ↓</span>
        <span>{formatBytes(proxy.trafficDown || 0)}</span>
      </div>
      {proxy.connectedIps && proxy.connectedIps.length > 0 && (
        <div className="proxy-card-field">
          <span className="label">Подключения</span>
          <span>{proxy.connectedIps.length}</span>
        </div>
      )}

      {/* Аккордеон статистики */}
      <div
        onClick={handleStatsToggle}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 10,
          padding: '8px 0',
          borderTop: '1px solid var(--g-color-line-generic)',
          fontSize: 13,
          color: 'var(--g-color-text-secondary)',
          userSelect: 'none',
        }}
      >
        <Icon data={showStats ? ChevronDown : ChevronRight} size={14} />
        Статистика
        {loadingStats && <span style={{ fontSize: 11, marginLeft: 4 }}>загрузка...</span>}
      </div>

      {showStats && stats && (
        <div style={{ paddingBottom: 4 }}>
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
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--g-color-text-secondary)', marginBottom: 4 }}>Подключенные IP:</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {stats.connectedIps.map((info: ConnectedIpInfo) => (
                  <Label key={info.ip} size="xs">
                    {info.countryCode ? countryFlag(info.countryCode) + ' ' : ''}{info.ip}
                  </Label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Футер: слева — DropdownMenu, справа — Ссылка */}
      <div className="proxy-card-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DropdownMenu
          size="s"
          items={menuItems}
        />
        <Button
          view="action"
          size="s"
          onClick={onCopyLink}
        >
          {copied ? '✓ Скопировано!' : 'Ссылка'}
        </Button>
      </div>
    </Card>
  );
}

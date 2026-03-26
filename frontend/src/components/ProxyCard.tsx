import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Label, DropdownMenu } from '@gravity-ui/uikit';
import { pauseProxy, unpauseProxy, ProxyData } from '../api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
  const navigate = useNavigate();
  const [togglingPause, setTogglingPause] = useState(false);

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

  const handleCardClick = () => {
    navigate(`/nodes/${nodeId}/proxy/${proxy.id}`);
  };

  const stopProp = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
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
    <Card type="action" view="outlined" style={{ padding: 20, cursor: 'pointer' }} onClick={handleCardClick}>
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

      {/* Футер: слева — DropdownMenu, справа — Ссылка */}
      <div className="proxy-card-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            size="s"
            items={menuItems}
          />
        </span>
        <Button
          view="action"
          size="s"
          onClick={stopProp(onCopyLink)}
        >
          {copied ? '✓ Скопировано!' : 'Ссылка'}
        </Button>
      </div>
    </Card>
  );
}

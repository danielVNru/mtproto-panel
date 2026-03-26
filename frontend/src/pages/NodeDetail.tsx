import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Loader, Label, Alert, TextArea } from '@gravity-ui/uikit';
import {
  getNode,
  getProxies,
  deleteProxy,
  getProxyLink,
  getNodeDomains,
  updateNodeDomains,
  getNodeBlacklist,
  updateNodeBlacklist,
  NodeData,
  ProxyData,
} from '../api';
import AddProxyDialog from '../components/AddProxyDialog';
import EditProxyDialog from '../components/EditProxyDialog';
import ProxyCard from '../components/ProxyCard';

function FlagIcon({ code }: { code?: string }) {
  if (!code || code.length !== 2) return null;
  return <img src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`} alt={code} style={{ verticalAlign: 'middle', marginRight: 4 }} width={20} height={15} />;
}

export default function NodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const nodeId = parseInt(id || '0', 10);

  const [node, setNode] = useState<NodeData | null>(null);
  const [proxies, setProxies] = useState<ProxyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editProxy, setEditProxy] = useState<ProxyData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [domainsText, setDomainsText] = useState('');
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsSaving, setDomainsSaving] = useState(false);
  const [domainsLoaded, setDomainsLoaded] = useState(false);
  const [blacklistText, setBlacklistText] = useState('');
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  const [blacklistSaving, setBlacklistSaving] = useState(false);
  const [blacklistLoaded, setBlacklistLoaded] = useState(false);
  const [nodeGeo, setNodeGeo] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [nodeData, proxiesData] = await Promise.all([
        getNode(nodeId),
        getProxies(nodeId),
      ]);
      setNode(nodeData);
      setProxies(proxiesData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    loadData();
    // Lookup node geo
    getNode(nodeId).then((n) => {
      fetch(`http://ip-api.com/json/${n.ip}?fields=countryCode`)
        .then((r) => r.json())
        .then((d: any) => { if (d.countryCode) setNodeGeo(d.countryCode); })
        .catch(() => {});
    }).catch(() => {});
    // Load domains
    setDomainsLoading(true);
    getNodeDomains(nodeId)
      .then((domains) => {
        setDomainsText(domains.join('\n'));
        setDomainsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setDomainsLoading(false));
    // Load blacklist
    setBlacklistLoading(true);
    getNodeBlacklist(nodeId)
      .then((ips) => {
        setBlacklistText(ips.join('\n'));
        setBlacklistLoaded(true);
      })
      .catch(() => {})
      .finally(() => setBlacklistLoading(false));
  }, [loadData]);

  const handleDelete = async (proxyId: string) => {
    if (!confirm('Удалить этот прокси?')) return;
    try {
      await deleteProxy(nodeId, proxyId);
      setProxies((prev) => prev.filter((p) => p.id !== proxyId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyLink = async (proxyId: string) => {
    try {
      const link = await getProxyLink(nodeId, proxyId);
      await navigator.clipboard.writeText(link);
      setCopiedId(proxyId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveDomains = async () => {
    setDomainsSaving(true);
    try {
      const domains = domainsText
        .split('\n')
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      const saved = await updateNodeDomains(nodeId, domains);
      setDomainsText(saved.join('\n'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDomainsSaving(false);
    }
  };

  const handleSaveBlacklist = async () => {
    setBlacklistSaving(true);
    try {
      const ips = blacklistText
        .split('\n')
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);
      const saved = await updateNodeBlacklist(nodeId, ips);
      setBlacklistText(saved.join('\n'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBlacklistSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Loader size="l" />
      </div>
    );
  }

  return (
    <>
      <div className="node-detail-header">
        <Button view="flat" onClick={() => navigate('/nodes')}>
          ← Назад
        </Button>
        {node && (
          <>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>{nodeGeo && <FlagIcon code={nodeGeo} />}{node.name}</h2>
            <Label theme="info">{node.ip}:{node.port}</Label>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert theme="danger" message={error} onClose={() => setError('')} />
        </div>
      )}

      <div className="proxies-header">
        <h3>Прокси ({proxies.length})</h3>
        <Button view="action" onClick={() => setShowAdd(true)}>
          + Добавить прокси
        </Button>
      </div>

      {proxies.length === 0 ? (
        <div className="empty-state">
          <p>На этой ноде пока нет прокси.</p>
          <p>Нажмите "Добавить прокси" для создания.</p>
        </div>
      ) : (
        <div className="proxy-cards">
          {proxies.map((proxy) => (
            <ProxyCard
              key={proxy.id}
              proxy={proxy}
              nodeId={nodeId}
              copied={copiedId === proxy.id}
              onEdit={() => setEditProxy(proxy)}
              onDelete={() => handleDelete(proxy.id)}
              onCopyLink={() => handleCopyLink(proxy.id)}
              onStatusChange={loadData}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h3>Словарь доменов</h3>
        <Card view="outlined" style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--g-color-text-secondary)', margin: '0 0 8px' }}>
            По одному домену на строку. Если список пуст — используется набор по умолчанию.
          </p>
          {domainsLoading ? (
            <Loader size="s" />
          ) : (
            <>
              <TextArea
                value={domainsText}
                onUpdate={setDomainsText}
                rows={10}
                placeholder="www.google.com&#10;fonts.googleapis.com&#10;cdn.jsdelivr.net"
                size="m"
              />
              <div style={{ marginTop: 8 }}>
                <Button
                  view="action"
                  size="s"
                  loading={domainsSaving}
                  onClick={handleSaveDomains}
                  disabled={!domainsLoaded}
                >
                  Сохранить
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Чёрный список IP</h3>
        <Card view="outlined" style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--g-color-text-secondary)', margin: '0 0 8px' }}>
            По одному IP на строку. Заблокированные IP не смогут подключиться ни к одному прокси ноды.
          </p>
          {blacklistLoading ? (
            <Loader size="s" />
          ) : (
            <>
              <TextArea
                value={blacklistText}
                onUpdate={setBlacklistText}
                rows={6}
                placeholder="1.2.3.4&#10;5.6.7.8"
                size="m"
              />
              <div style={{ marginTop: 8 }}>
                <Button
                  view="action"
                  size="s"
                  loading={blacklistSaving}
                  onClick={handleSaveBlacklist}
                  disabled={!blacklistLoaded}
                >
                  Сохранить
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <AddProxyDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        nodeId={nodeId}
        onCreated={() => {
          setShowAdd(false);
          loadData();
        }}
      />

      {editProxy && (
        <EditProxyDialog
          open={!!editProxy}
          onClose={() => setEditProxy(null)}
          nodeId={nodeId}
          proxy={editProxy}
          onUpdated={() => {
            setEditProxy(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

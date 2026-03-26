import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Loader, Label, Alert, Select } from '@gravity-ui/uikit';
import {
  getAllProxies,
  getNodes,
  deleteProxy,
  getProxyLink,
  NodeData,
  ProxyData,
} from '../api';
import EditProxyDialog from '../components/EditProxyDialog';
import ProxyCard from '../components/ProxyCard';
import AddProxyDialog from '../components/AddProxyDialog';

interface NodeProxies {
  nodeId: number;
  nodeName: string;
  nodeIp: string;
  proxies: ProxyData[];
}

export default function Proxies() {
  const [nodeProxies, setNodeProxies] = useState<NodeProxies[]>([]);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editProxy, setEditProxy] = useState<{ proxy: ProxyData; nodeId: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterNodeId, setFilterNodeId] = useState<string[]>(['all']);

  const loadData = useCallback(async () => {
    try {
      const [allProxies, nodesList] = await Promise.all([
        getAllProxies(),
        getNodes(),
      ]);
      setNodeProxies(allProxies);
      setNodes(nodesList);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (nodeId: number, proxyId: string) => {
    if (!confirm('Удалить этот прокси?')) return;
    try {
      await deleteProxy(nodeId, proxyId);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyLink = async (nodeId: number, proxyId: string) => {
    try {
      const link = await getProxyLink(nodeId, proxyId);
      await navigator.clipboard.writeText(link);
      setCopiedId(proxyId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const selectedNodeId = filterNodeId[0] || 'all';

  const allProxies = nodeProxies
    .filter((np) => selectedNodeId === 'all' || np.nodeId.toString() === selectedNodeId)
    .flatMap((np) =>
      np.proxies.map((p) => ({ ...p, nodeId: np.nodeId, nodeName: np.nodeName, nodeIp: np.nodeIp }))
    );

  const totalProxies = nodeProxies.reduce((sum, np) => sum + np.proxies.length, 0);

  const filterOptions = [
    { value: 'all', content: 'Все ноды' },
    ...nodes.map((n) => ({ value: n.id.toString(), content: `${n.name} (${n.ip})` })),
  ];

  return (
    <>
      <div className="proxies-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Прокси ({totalProxies})</h2>
          {nodes.length > 1 && (
            <Select
              value={filterNodeId}
              onUpdate={setFilterNodeId}
              options={filterOptions}
              width={200}
            />
          )}
        </div>
        <Button view="action" onClick={() => setShowAdd(true)}>
          + Добавить прокси
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert theme="danger" message={error} onClose={() => setError('')} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Loader size="l" />
        </div>
      ) : allProxies.length === 0 ? (
        <div className="empty-state">
          <p>Прокси не найдены.</p>
          <p>Добавьте прокси для начала работы.</p>
        </div>
      ) : (
        <div className="proxy-cards">
          {allProxies.map((proxy) => (
            <ProxyCard
              key={`${proxy.nodeId}-${proxy.id}`}
              proxy={proxy}
              nodeId={proxy.nodeId}
              nodeName={proxy.nodeName}
              copied={copiedId === proxy.id}
              onEdit={() => setEditProxy({ proxy, nodeId: proxy.nodeId })}
              onDelete={() => handleDelete(proxy.nodeId, proxy.id)}
              onCopyLink={() => handleCopyLink(proxy.nodeId, proxy.id)}
              onStatusChange={loadData}
            />
          ))}
        </div>
      )}

      <AddProxyDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        nodes={nodes}
        onCreated={() => {
          setShowAdd(false);
          loadData();
        }}
      />

      {editProxy && (
        <EditProxyDialog
          open={!!editProxy}
          onClose={() => setEditProxy(null)}
          nodeId={editProxy.nodeId}
          proxy={editProxy.proxy}
          onUpdated={() => {
            setEditProxy(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

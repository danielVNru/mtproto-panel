import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Label, Loader } from '@gravity-ui/uikit';
import { getNodes, deleteNode, checkNodeHealth, updateNodeService, getProxies, NodeData, ProxyData } from '../api';
import AddNodeDialog from '../components/AddNodeDialog';

function FlagIcon({ code }: { code?: string }) {
  if (!code || code.length !== 2) return null;
  return <img src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`} alt={code} style={{ verticalAlign: 'middle', marginRight: 4 }} width={20} height={15} />;
}

export default function Nodes() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [healthMap, setHealthMap] = useState<Record<number, boolean | null>>({});
  const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});
  const [proxiesMap, setProxiesMap] = useState<Record<number, ProxyData[]>>({});
  const [geoMap, setGeoMap] = useState<Record<string, string>>({});

  const loadNodes = async () => {
    try {
      const data = await getNodes();
      setNodes(data);
      checkAllHealth(data);
      loadAllProxies(data);
      lookupNodeGeo(data);
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const lookupNodeGeo = async (nodeList: NodeData[]) => {
    const ips = nodeList.map((n) => n.ip).filter((ip) => !geoMap[ip]);
    if (ips.length === 0) return;
    try {
      const resp = await fetch('http://ip-api.com/batch?fields=query,countryCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ips.map((ip) => ({ query: ip }))),
      });
      if (resp.ok) {
        const data = await resp.json() as Array<{ query: string; countryCode?: string }>;
        const map: Record<string, string> = {};
        for (const entry of data) {
          if (entry.countryCode) map[entry.query] = entry.countryCode;
        }
        setGeoMap((prev) => ({ ...prev, ...map }));
      }
    } catch {}
  };

  const loadAllProxies = async (nodeList: NodeData[]) => {
    await Promise.all(
      nodeList.map(async (node) => {
        try {
          const proxies = await getProxies(node.id);
          setProxiesMap((prev) => ({ ...prev, [node.id]: proxies }));
        } catch {
          setProxiesMap((prev) => ({ ...prev, [node.id]: [] }));
        }
      }),
    );
  };

  const checkAllHealth = async (nodeList: NodeData[]) => {
    const map: Record<number, boolean | null> = {};
    nodeList.forEach((n) => (map[n.id] = null));
    setHealthMap(map);

    await Promise.all(
      nodeList.map(async (node) => {
        try {
          const { online } = await checkNodeHealth(node.id);
          setHealthMap((prev) => ({ ...prev, [node.id]: online }));
        } catch {
          setHealthMap((prev) => ({ ...prev, [node.id]: false }));
        }
      }),
    );
  };

  useEffect(() => {
    loadNodes();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить эту ноду?')) return;
    try {
      await deleteNode(id);
      setNodes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  };

  const handleUpdate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingMap((prev) => ({ ...prev, [id]: true }));
    try {
      await updateNodeService(id);
    } catch (err) {
      console.error('Failed to update node:', err);
    } finally {
      setUpdatingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <>
      <div className="nodes-header">
        <h2 style={{ margin: 0 }}>Ноды</h2>
        <Button view="action" onClick={() => setShowAdd(true)}>
          + Добавить ноду
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Loader size="l" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="empty-state">
          <p>Ноды ещё не добавлены.</p>
          <p>Добавьте ноду для управления MTProto прокси.</p>
        </div>
      ) : (
        <div className="node-cards">
          {nodes.map((node) => (
            <Card
              key={node.id}
              className="node-card"
              type="action"
              view="outlined"
              onClick={() => navigate(`/nodes/${node.id}`)}
              style={{ padding: 20, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      display: 'inline-block',
                      backgroundColor:
                        healthMap[node.id] === null
                          ? '#888'
                          : healthMap[node.id]
                            ? '#3bc935'
                            : '#ff4040',
                    }}
                    title={
                      healthMap[node.id] === null
                        ? 'Проверка...'
                        : healthMap[node.id]
                          ? 'Онлайн'
                          : 'Офлайн'
                    }
                  />
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>{geoMap[node.ip] && <FlagIcon code={geoMap[node.ip]} />}{node.name}</h3>
                </div>
                <Label theme="info" size="s">
                  Нода #{node.id}
                </Label>
              </div>
              <div className="proxy-card-field">
                <span className="label">IP</span>
                <span>{node.ip}</span>
              </div>
              <div className="proxy-card-field">
                <span className="label">Порт</span>
                <span>{node.port}</span>
              </div>
              <div className="proxy-card-field">
                <span className="label">Добавлено</span>
                <span>{new Date(node.created_at).toLocaleDateString()}</span>
              </div>
              {proxiesMap[node.id] && proxiesMap[node.id].length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--g-color-line-generic)', paddingTop: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--g-color-text-secondary)', marginBottom: 6 }}>
                    Прокси ({proxiesMap[node.id].length}):
                  </div>
                  {proxiesMap[node.id].map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '2px 0' }}>
                      <span>{p.name || `Proxy ${p.id}`}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--g-color-text-secondary)' }}>
                          {p.connectedIps?.length || 0} подк.
                        </span>
                        <Label
                          theme={p.status === 'running' ? 'success' : p.status === 'stopped' || p.status === 'paused' ? 'warning' : 'danger'}
                          size="xs"
                        >
                          {p.status === 'running' ? 'работает' : p.status === 'paused' ? 'пауза' : p.status === 'stopped' ? 'остановлен' : 'ошибка'}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button
                  view="outlined"
                  size="s"
                  loading={updatingMap[node.id] || false}
                  onClick={(e) => handleUpdate(node.id, e)}
                >
                  Обновить
                </Button>
                <Button
                  view="flat-danger"
                  size="s"
                  onClick={(e) => handleDelete(node.id, e)}
                >
                  Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddNodeDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => {
          setShowAdd(false);
          loadNodes();
        }}
      />
    </>
  );
}

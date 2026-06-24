import { useState, FormEvent } from 'react';
import { Dialog, TextInput, Alert, Select, RadioButton, HelpMark, Tabs } from '@gravity-ui/uikit';
import { createProxy, NodeData } from '../api';
import { DEFAULT_ADVANCED, AdvancedOptions, TelemtFields } from './TelemtFields';

interface Props {
  open: boolean;
  onClose: () => void;
  nodeId?: number;
  nodes?: NodeData[];
  onCreated: () => void;
}

export default function AddProxyDialog({ open, onClose, nodeId, nodes, onCreated }: Props) {
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodeId ? nodeId.toString() : '');
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [maxConnections, setMaxConnections] = useState('');
  const [listenPort, setListenPort] = useState('');
  const [outboundMode, setOutboundMode] = useState<'vpn' | 'tunnel'>('vpn');
  const [vpnSubscription, setVpnSubscription] = useState('');
  const [natIp, setNatIp] = useState('');
  const [tunnelInterface, setTunnelInterface] = useState('');
  const [maskHost, setMaskHost] = useState('');
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({ ...DEFAULT_ADVANCED });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const targetNodeId = nodeId || parseInt(selectedNodeId, 10);
    if (!targetNodeId) {
      setError('Выберите узел');
      return;
    }

    setLoading(true);

    try {
      const { stunServers: stunStr, censorshipTlsDomain: censD, censorshipTlsFrontDir: censFD, ...restOpts } = advancedOptions;
      await createProxy(targetNodeId, {
        domain: domain || undefined,
        tag: tag || undefined,
        name: name || undefined,
        note: note || undefined,
        maxConnections: maxConnections ? parseInt(maxConnections, 10) : undefined,
        listenPort: listenPort ? parseInt(listenPort, 10) : undefined,
        vpnSubscription: outboundMode === 'vpn' ? (vpnSubscription || undefined) : undefined,
        natIp: outboundMode === 'tunnel' ? (natIp || undefined) : undefined,
        tunnelInterface: outboundMode === 'tunnel' ? (tunnelInterface || undefined) : undefined,
        maskHost: maskHost || undefined,
        ...restOpts,
        stunServers: stunStr.split(',').map((s) => s.trim()).filter(Boolean),
        censorshipTlsDomain: censD || undefined,
        censorshipTlsFrontDir: censFD || undefined,
      });
      setDomain('');
      setName('');
      setNote('');
      setTag('');
      setMaxConnections('');
      setListenPort('');
      setVpnSubscription('');
      setNatIp('');
      setTunnelInterface('');
      setMaskHost('');
      setSelectedNodeId(nodeId ? nodeId.toString() : '');
      setAdvancedOptions({ ...DEFAULT_ADVANCED });
      setActiveTab('basic');
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="m">
      <Dialog.Header caption="Добавить прокси" />
      <Dialog.Body>
        <form onSubmit={handleSubmit} id="add-proxy-form">
          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert theme="danger" message={error} />
            </div>
          )}
          <Tabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            items={[
              { id: 'basic', title: 'Основные' },
              { id: 'telemt', title: 'Telemt' },
            ]}
            size="l"
            className="dialog-tabs"
          />

          <div style={{ marginTop: 16 }}>
            {activeTab === 'basic' && (
            <>
              {!nodeId && nodes && (
                <div className="dialog-field">
                  <label>Узел *</label>
                  <Select
                    value={selectedNodeId ? [selectedNodeId] : []}
                    onUpdate={(val) => setSelectedNodeId(val[0] || '')}
                    placeholder="Выберите узел"
                    width="max"
                    options={nodes.map((n) => ({ value: n.id.toString(), content: `${n.name} (${n.ip})` }))}
                  />
                </div>
              )}
              <div className="dialog-field">
                <label>Название (опционально)</label>
                <TextInput value={name} onUpdate={setName} placeholder="Имя прокси" size="l" />
              </div>
              <div className="dialog-field">
                <label>Заметка (опционально)</label>
                <TextInput value={note} onUpdate={setNote} placeholder="Описание" size="l" />
              </div>
              <div className="dialog-field">
                <label>Fake TLS домен (опционально)</label>
                <TextInput value={domain} onUpdate={setDomain} placeholder="напр. www.google.com" size="l" />
              </div>
              <div className="dialog-field">
                <label>Промо тег (опционально)</label>
                <TextInput value={tag} onUpdate={setTag} placeholder="Промо тег" size="l" />
              </div>
              <div className="dialog-field">
                <label>Максимум подключений (0 = без лимита)</label>
                <TextInput value={maxConnections} onUpdate={setMaxConnections} placeholder="0" size="l" type="number" />
              </div>
              <div className="dialog-field">
                <label>Порт прослушивания (пусто = SNI на 443)</label>
                <TextInput value={listenPort} onUpdate={setListenPort} placeholder="напр. 8443" size="l" type="number" />
              </div>
              <div className="dialog-field">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <label style={{ margin: 0 }}>Исходящий трафик</label>
                  <HelpMark>VPN-подписка или туннель. VPN работает через VLESS/Trojan/SOCKS5, а промо Telegram не гарантируется. Туннель идет через SSH/OpenVPN, промо работает при правильно настроенном NAT IP.</HelpMark>
                </div>
                <RadioButton
                  value={outboundMode}
                  onUpdate={(v) => setOutboundMode(v as 'vpn' | 'tunnel')}
                  size="m"
                  options={[
                    { value: 'vpn', content: 'VPN-подписка' },
                    { value: 'tunnel', content: 'Туннель (SSH/VPN)' },
                  ]}
                />
              </div>
              {outboundMode === 'vpn' && (
                <div className="dialog-field">
                  <label>VLESS/Trojan URL или socks5:// (опционально)</label>
                  <TextInput value={vpnSubscription} onUpdate={setVpnSubscription} placeholder="https://... , trojan://... или socks5://127.0.0.1:10808" size="l" />
                </div>
              )}
              {outboundMode === 'tunnel' && (
                <>
                  <div className="dialog-field">
                    <label>NAT IP — публичный IP туннельного сервера</label>
                    <TextInput value={natIp} onUpdate={setNatIp} placeholder="напр. 150.241.105.36" size="l" />
                  </div>
                  <div className="dialog-field">
                    <label>Интерфейс туннеля</label>
                    <TextInput value={tunnelInterface} onUpdate={setTunnelInterface} placeholder="напр. tun0" size="l" />
                  </div>
                </>
              )}
              <div className="dialog-field">
                <label>Self-steal — куда перенаправлять не-MTProto трафик (опционально)</label>
                <TextInput value={maskHost} onUpdate={setMaskHost} placeholder="напр. 127.0.0.1:8080" size="l" />
              </div>
            </>
          )}

            {activeTab === 'telemt' && (
              <TelemtFields opts={advancedOptions} set={setAdvancedOptions} />
            )}
          </div>
        </form>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonApply={handleSubmit as any}
        onClickButtonCancel={onClose}
        textButtonApply="Создать"
        textButtonCancel="Отмена"
        loading={loading}
      />
    </Dialog>
  );
}

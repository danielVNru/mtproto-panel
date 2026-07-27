import { useState, FormEvent, useEffect } from 'react';
import { Dialog, TextInput, Alert, Button, RadioButton, HelpMark, Tabs } from '@gravity-ui/uikit';
import { updateProxy, ProxyData } from '../api';
import { copyToClipboard } from '../utils/clipboard';
import { DEFAULT_ADVANCED, AdvancedOptions, TelemtFields, normalizeBooleanLike } from './TelemtFields';

interface Props {
  open: boolean;
  onClose: () => void;
  nodeId: number;
  proxy: ProxyData;
  onUpdated: () => void;
}

function proxyToAdvanced(proxy: ProxyData): AdvancedOptions {
  return {
    useMiddleProxy: proxy.useMiddleProxy ?? DEFAULT_ADVANCED.useMiddleProxy,
    fastMode: proxy.fastMode ?? DEFAULT_ADVANCED.fastMode,
    me2dcFallback: proxy.me2dcFallback ?? DEFAULT_ADVANCED.me2dcFallback,
    me2dcFast: proxy.me2dcFast ?? DEFAULT_ADVANCED.me2dcFast,
    meKeepaliveEnabled: proxy.meKeepaliveEnabled ?? DEFAULT_ADVANCED.meKeepaliveEnabled,
    meKeepaliveIntervalSecs: proxy.meKeepaliveIntervalSecs ?? DEFAULT_ADVANCED.meKeepaliveIntervalSecs,
    meKeepaliveJitterSecs: proxy.meKeepaliveJitterSecs ?? DEFAULT_ADVANCED.meKeepaliveJitterSecs,
    meKeepalivePayloadRandom: proxy.meKeepalivePayloadRandom ?? DEFAULT_ADVANCED.meKeepalivePayloadRandom,
    meReconnectBackoffBaseMs: proxy.meReconnectBackoffBaseMs ?? DEFAULT_ADVANCED.meReconnectBackoffBaseMs,
    meReconnectBackoffCapMs: proxy.meReconnectBackoffCapMs ?? DEFAULT_ADVANCED.meReconnectBackoffCapMs,
    meReconnectFastRetryCount: proxy.meReconnectFastRetryCount ?? DEFAULT_ADVANCED.meReconnectFastRetryCount,
    desyncAllFull: proxy.desyncAllFull ?? DEFAULT_ADVANCED.desyncAllFull,
    meWriterPickMode: proxy.meWriterPickMode ?? DEFAULT_ADVANCED.meWriterPickMode,
    meWarmupStaggerEnabled: proxy.meWarmupStaggerEnabled ?? DEFAULT_ADVANCED.meWarmupStaggerEnabled,
    meWarmupStepDelayMs: proxy.meWarmupStepDelayMs ?? DEFAULT_ADVANCED.meWarmupStepDelayMs,
    meWarmupStepJitterMs: proxy.meWarmupStepJitterMs ?? DEFAULT_ADVANCED.meWarmupStepJitterMs,
    beobachten: proxy.beobachten ?? DEFAULT_ADVANCED.beobachten,
    beobachtenMinutes: proxy.beobachtenMinutes ?? DEFAULT_ADVANCED.beobachtenMinutes,
    beobachtenFlushSecs: proxy.beobachtenFlushSecs ?? DEFAULT_ADVANCED.beobachtenFlushSecs,
    beobachtenFile: proxy.beobachtenFile ?? DEFAULT_ADVANCED.beobachtenFile,
    upstreamConnectRetryAttempts: proxy.upstreamConnectRetryAttempts ?? DEFAULT_ADVANCED.upstreamConnectRetryAttempts,
    upstreamConnectRetryBackoffMs: proxy.upstreamConnectRetryBackoffMs ?? DEFAULT_ADVANCED.upstreamConnectRetryBackoffMs,
    tgConnect: proxy.tgConnect ?? DEFAULT_ADVANCED.tgConnect,
    rstOnClose: proxy.rstOnClose ?? DEFAULT_ADVANCED.rstOnClose,
    logLevel: proxy.logLevel ?? DEFAULT_ADVANCED.logLevel,
    unknownDcFileLogEnabled: proxy.unknownDcFileLogEnabled ?? DEFAULT_ADVANCED.unknownDcFileLogEnabled,
    updateEvery: proxy.updateEvery ?? DEFAULT_ADVANCED.updateEvery,
    networkPrefer: proxy.networkPrefer ?? DEFAULT_ADVANCED.networkPrefer,
    stunServers: proxy.stunServers ? proxy.stunServers.join(', ') : DEFAULT_ADVANCED.stunServers,
    serverClientMss: proxy.serverClientMss ?? DEFAULT_ADVANCED.serverClientMss,
    censorshipTlsDomain: proxy.censorshipTlsDomain ?? DEFAULT_ADVANCED.censorshipTlsDomain,
    censorshipTlsEmulation: normalizeBooleanLike(proxy.censorshipTlsEmulation, DEFAULT_ADVANCED.censorshipTlsEmulation),
    censorshipTlsFrontDir: proxy.censorshipTlsFrontDir ?? DEFAULT_ADVANCED.censorshipTlsFrontDir,
    meInitRetryAttempts: proxy.meInitRetryAttempts ?? DEFAULT_ADVANCED.meInitRetryAttempts,
  };
}

export default function EditProxyDialog({ open, onClose, nodeId, proxy, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState('basic');
  const [name, setName] = useState(proxy.name || '');
  const [note, setNote] = useState(proxy.note || '');
  const [domain, setDomain] = useState(proxy.domain);
  const [tag, setTag] = useState(proxy.tag || '');
  const [maxConnections, setMaxConnections] = useState(proxy.maxConnections ? proxy.maxConnections.toString() : '');
  const [listenPort, setListenPort] = useState(proxy.listenPort ? proxy.listenPort.toString() : '');
  const [outboundMode, setOutboundMode] = useState<'vpn' | 'tunnel'>(proxy.natIp || proxy.tunnelInterface ? 'tunnel' : 'vpn');
  const [vpnSubscription, setVpnSubscription] = useState(proxy.vpnSubscription || '');
  const [natIp, setNatIp] = useState(proxy.natIp || '');
  const [tunnelInterface, setTunnelInterface] = useState(proxy.tunnelInterface || '');
  const [maskHost, setMaskHost] = useState(proxy.maskHost || '');
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>(() => proxyToAdvanced(proxy));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    setName(proxy.name || '');
    setNote(proxy.note || '');
    setDomain(proxy.domain);
    setTag(proxy.tag || '');
    setMaxConnections(proxy.maxConnections ? proxy.maxConnections.toString() : '');
    setListenPort(proxy.listenPort ? proxy.listenPort.toString() : '');
    setOutboundMode(proxy.natIp || proxy.tunnelInterface ? 'tunnel' : 'vpn');
    setVpnSubscription(proxy.vpnSubscription || '');
    setNatIp(proxy.natIp || '');
    setTunnelInterface(proxy.tunnelInterface || '');
    setMaskHost(proxy.maskHost || '');
    setAdvancedOptions(proxyToAdvanced(proxy));
  }, [proxy]);

  const handleCopySecret = async () => {
    await copyToClipboard(proxy.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { stunServers: stunStr, censorshipTlsDomain: censD, censorshipTlsEmulation: censTE, censorshipTlsFrontDir: censFD, ...restOpts } = advancedOptions;
      await updateProxy(nodeId, proxy.id, {
        name: name !== (proxy.name || '') ? name : undefined,
        note: note !== (proxy.note || '') ? note : undefined,
        domain: domain !== proxy.domain ? domain : undefined,
        tag: tag !== (proxy.tag || '') ? tag : undefined,
        maxConnections: parseInt(maxConnections, 10) || 0,
        listenPort: listenPort ? parseInt(listenPort, 10) : undefined,
        vpnSubscription: outboundMode === 'vpn'
          ? (vpnSubscription !== (proxy.vpnSubscription || '') ? vpnSubscription : undefined)
          : '',
        natIp: outboundMode === 'tunnel'
          ? (natIp !== (proxy.natIp || '') ? natIp : undefined)
          : (proxy.natIp ? '' : undefined),
        tunnelInterface: outboundMode === 'tunnel'
          ? (tunnelInterface !== (proxy.tunnelInterface || '') ? tunnelInterface : undefined)
          : (proxy.tunnelInterface ? '' : undefined),
        maskHost: maskHost !== (proxy.maskHost || '') ? maskHost : undefined,
        ...restOpts,
        stunServers: stunStr.split(',').map((s) => s.trim()).filter(Boolean),
        censorshipTlsDomain: censD || undefined,
        censorshipTlsEmulation: normalizeBooleanLike(censTE, DEFAULT_ADVANCED.censorshipTlsEmulation),
        censorshipTlsFrontDir: censFD || undefined,
      });
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="m">
      <Dialog.Header caption={`Редактировать ${proxy.name || 'прокси'}`} />
      <Dialog.Body>
        <form onSubmit={handleSubmit} id="edit-proxy-form">
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
              <div className="dialog-field">
                <label>Название</label>
                <TextInput value={name} onUpdate={setName} placeholder="Название прокси" size="l" />
              </div>
              <div className="dialog-field">
                <label>Заметка</label>
                <TextInput value={note} onUpdate={setNote} placeholder="Описание" size="l" />
              </div>
              <div className="dialog-field">
                <label>Секрет</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TextInput value={proxy.secret} size="l" disabled style={{ flex: 1 }} />
                  <Button view="outlined" size="l" onClick={handleCopySecret}>
                    {secretCopied ? 'Скопировано' : 'Копировать'}
                  </Button>
                </div>
              </div>
              <div className="dialog-field">
                <label>Fake TLS домен</label>
                <TextInput value={domain} onUpdate={setDomain} size="l" />
              </div>
              <div className="dialog-field">
                <label>Промо тег</label>
                <TextInput value={tag} onUpdate={setTag} placeholder="Опционально" size="l" />
              </div>
              <div className="dialog-field">
                <label>Лимит подключений (0 = без лимита)</label>
                <TextInput value={maxConnections} onUpdate={setMaxConnections} placeholder="0" size="l" type="number" />
              </div>
              <div className="dialog-field">
                <label>Собственный порт прослушивания (пусто = SNI на 443)</label>
                <TextInput value={listenPort} onUpdate={setListenPort} placeholder="напр. 8443" size="l" type="number" />
              </div>
              <div className="dialog-field">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <label style={{ margin: 0 }}>Исходящий трафик</label>
                  <HelpMark>VPN-подписка - трафик через VLESS/SOCKS5. Промо от Telegram не работает. Тоннель - трафик через SSH/OpenVPN. Промо работает при правильно настроенном NAT IP.</HelpMark>
                </div>
                <RadioButton
                  value={outboundMode}
                  onUpdate={(v) => setOutboundMode(v as 'vpn' | 'tunnel')}
                  size="m"
                  options={[
                    { value: 'vpn', content: 'VPN-подписка' },
                    { value: 'tunnel', content: 'Тоннель (SSH/VPN)' },
                  ]}
                />
              </div>
              {outboundMode === 'vpn' && (
                <div className="dialog-field">
                  <label>VLESS URL или socks5:// (пусто = отключить)</label>
                  <TextInput value={vpnSubscription} onUpdate={setVpnSubscription} placeholder="https://... или socks5://127.0.0.1:10808" size="l" />
                </div>
              )}
              {outboundMode === 'tunnel' && (
                <>
                  <div className="dialog-field">
                    <label>NAT IP - публичный IP тоннельного сервера</label>
                    <TextInput value={natIp} onUpdate={setNatIp} placeholder="напр. 150.241.105.36" size="l" />
                  </div>
                  <div className="dialog-field">
                    <label>Интерфейс тоннеля</label>
                    <TextInput value={tunnelInterface} onUpdate={setTunnelInterface} placeholder="напр. tun0" size="l" />
                  </div>
                </>
              )}
              <div className="dialog-field">
                <label>Self-steal - куда перенаправлять не-MTProto трафик (пусто = отключить)</label>
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
        textButtonApply="Сохранить"
        textButtonCancel="Отмена"
        loading={loading}
      />
    </Dialog>
  );
}

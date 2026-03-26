import { useState, FormEvent } from 'react';
import { Dialog, TextInput, Alert } from '@gravity-ui/uikit';
import { updateProxy, ProxyData } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  nodeId: number;
  proxy: ProxyData;
  onUpdated: () => void;
}

export default function EditProxyDialog({ open, onClose, nodeId, proxy, onUpdated }: Props) {
  const [name, setName] = useState(proxy.name || '');
  const [note, setNote] = useState(proxy.note || '');
  const [domain, setDomain] = useState(proxy.domain);
  const [tag, setTag] = useState(proxy.tag || '');
  const [maxConnections, setMaxConnections] = useState(proxy.maxConnections ? proxy.maxConnections.toString() : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await updateProxy(nodeId, proxy.id, {
        name: name !== (proxy.name || '') ? name : undefined,
        note: note !== (proxy.note || '') ? note : undefined,
        domain: domain !== proxy.domain ? domain : undefined,
        tag: tag !== (proxy.tag || '') ? tag : undefined,
        maxConnections: parseInt(maxConnections, 10) || 0,
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
          <div className="dialog-field">
            <label>Название</label>
            <TextInput value={name} onUpdate={setName} placeholder="Название прокси" size="l" />
          </div>
          <div className="dialog-field">
            <label>Заметка</label>
            <TextInput value={note} onUpdate={setNote} placeholder="Описание" size="l" />
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

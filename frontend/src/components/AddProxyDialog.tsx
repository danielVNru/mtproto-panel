import { useState, FormEvent } from 'react';
import { Dialog, Button, TextInput, Alert, Select } from '@gravity-ui/uikit';
import { createProxy, NodeData } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  nodeId?: number;
  nodes?: NodeData[];
  onCreated: () => void;
}

export default function AddProxyDialog({ open, onClose, nodeId, nodes, onCreated }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodeId ? nodeId.toString() : '');
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [maxConnections, setMaxConnections] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const targetNodeId = nodeId || parseInt(selectedNodeId, 10);
    if (!targetNodeId) {
      setError('Выберите ноду');
      return;
    }

    setLoading(true);

    try {
      await createProxy(targetNodeId, {
        domain: domain || undefined,
        tag: tag || undefined,
        name: name || undefined,
        note: note || undefined,
        maxConnections: maxConnections ? parseInt(maxConnections, 10) : undefined,
      });
      setDomain('');
      setName('');
      setNote('');
      setTag('');
      setMaxConnections('');
      setSelectedNodeId(nodeId ? nodeId.toString() : '');
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
          {!nodeId && nodes && (
            <div className="dialog-field">
              <label>Нода *</label>
              <Select
                value={selectedNodeId ? [selectedNodeId] : []}
                onUpdate={(val) => setSelectedNodeId(val[0] || '')}
                placeholder="Выберите ноду"
                width="max"
                options={nodes.map((n) => ({ value: n.id.toString(), content: `${n.name} (${n.ip})` }))}
              />
            </div>
          )}
          <div className="dialog-field">
            <label>Название (необязательно)</label>
            <TextInput value={name} onUpdate={setName} placeholder="Мой прокси" size="l" />
          </div>
          <div className="dialog-field">
            <label>Заметка (необязательно)</label>
            <TextInput value={note} onUpdate={setNote} placeholder="Описание" size="l" />
          </div>
          <div className="dialog-field">
            <label>Fake TLS домен (необязательно, из пула)</label>
            <TextInput value={domain} onUpdate={setDomain} placeholder="напр. www.google.com" size="l" />
          </div>
          <div className="dialog-field">
            <label>Промо тег (необязательно)</label>
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
        textButtonApply="Создать"
        textButtonCancel="Отмена"
        loading={loading}
      />
    </Dialog>
  );
}

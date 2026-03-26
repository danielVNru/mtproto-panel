import { useState, FormEvent } from 'react';
import { Dialog, Button, TextInput, Alert } from '@gravity-ui/uikit';
import { createNode, checkNodeConnection } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddNodeDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8443');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ip || !port || !token) {
      setError('IP, порт и токен обязательны');
      return;
    }

    setLoading(true);
    try {
      const { online } = await checkNodeConnection(ip, parseInt(port, 10), token);
      if (!online) {
        setError('Не удалось подключиться к ноде. Проверьте IP, порт и токен.');
        setLoading(false);
        return;
      }
      await createNode({
        name: name || undefined,
        ip,
        port: parseInt(port, 10),
        token,
      });
      setName('');
      setIp('');
      setPort('8443');
      setToken('');
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="m">
      <Dialog.Header caption="Добавить ноду" />
      <Dialog.Body>
        <form onSubmit={handleSubmit} id="add-node-form">
          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert theme="danger" message={error} />
            </div>
          )}
          <div className="dialog-field">
            <label>Название (необязательно)</label>
            <TextInput value={name} onUpdate={setName} placeholder="Мой сервер" size="l" />
          </div>
          <div className="dialog-field">
            <label>IP адрес *</label>
            <TextInput value={ip} onUpdate={setIp} placeholder="123.45.67.89" size="l" />
          </div>
          <div className="dialog-field">
            <label>Порт *</label>
            <TextInput value={port} onUpdate={setPort} placeholder="8443" size="l" type="number" />
          </div>
          <div className="dialog-field">
            <label>Токен доступа *</label>
            <TextInput value={token} onUpdate={setToken} placeholder="Токен из скрипта установки" size="l" />
          </div>
        </form>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonApply={handleSubmit as any}
        onClickButtonCancel={onClose}
        textButtonApply="Добавить"
        textButtonCancel="Отмена"
        loading={loading}
      />
    </Dialog>
  );
}

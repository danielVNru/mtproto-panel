import { useState, useEffect } from 'react';
import { Card, TextInput, Button, Alert, Label } from '@gravity-ui/uikit';
import { getMe } from '../api';

export default function Settings() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setUsername(data.user.username))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h2 style={{ margin: '0 0 24px 0' }}>Настройки</h2>

      <Card view="outlined" style={{ padding: 24, maxWidth: 500 }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Аккаунт</h3>
        <div className="dialog-field">
          <label>Имя пользователя</label>
          <TextInput value={username} size="l" disabled />
        </div>
        <div style={{ marginTop: 8 }}>
          <Label theme="info" size="s">
            Для смены пароля обновите переменную ADMIN_PASSWORD и перезапустите бэкенд.
          </Label>
        </div>
      </Card>
    </>
  );
}

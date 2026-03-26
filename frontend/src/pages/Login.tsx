import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextInput, Card, Alert } from '@gravity-ui/uikit';
import { login } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/nodes');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" view="outlined">
        <h2>MTProto Panel</h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert theme="danger" message={error} />
            </div>
          )}
          <div className="form-field">
            <label>Имя пользователя</label>
            <TextInput
              value={username}
              onUpdate={setUsername}
              placeholder="Введите имя"
              size="l"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Пароль</label>
            <TextInput
              value={password}
              onUpdate={setPassword}
              type="password"
              placeholder="Введите пароль"
              size="l"
            />
          </div>
          <Button
            type="submit"
            view="action"
            size="l"
            width="max"
            loading={loading}
          >
            Войти
          </Button>
        </form>
      </Card>
    </div>
  );
}

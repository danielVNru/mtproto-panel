import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './api';
import Login from './pages/Login';
import Nodes from './pages/Nodes';
import NodeDetail from './pages/NodeDetail';
import Proxies from './pages/Proxies';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/nodes"
        element={
          <PrivateRoute>
            <Nodes />
          </PrivateRoute>
        }
      />
      <Route
        path="/nodes/:id"
        element={
          <PrivateRoute>
            <NodeDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/proxies"
        element={
          <PrivateRoute>
            <Proxies />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/nodes" />} />
    </Routes>
  );
}

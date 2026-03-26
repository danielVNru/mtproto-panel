import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AsideHeader, FooterItem } from '@gravity-ui/navigation';
import {
  Server,
  ArrowRightFromSquare,
  Gear,
  PlugConnection,
} from '@gravity-ui/icons';
import { logout } from '../api';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [compact, setCompact] = useState(false);

  const currentPath = location.pathname;

  const menuItems = [
    {
      id: 'nodes',
      title: 'Ноды',
      icon: Server,
      current: currentPath === '/nodes' || currentPath.startsWith('/nodes/'),
      onItemClick: () => navigate('/nodes'),
    },
    {
      id: 'proxies',
      title: 'Прокси',
      icon: PlugConnection,
      current: currentPath === '/proxies',
      onItemClick: () => navigate('/proxies'),
    },
    {
      id: 'settings',
      title: 'Настройки',
      icon: Gear,
      current: currentPath === '/settings',
      onItemClick: () => navigate('/settings'),
    },
  ];

  return (
    <AsideHeader
      compact={compact}
      onChangeCompact={setCompact}
      menuItems={menuItems}
      logo={{
        text: 'MTProto Panel',
      }}
      renderContent={() => (
        <div className="app-content">
          {children}
        </div>
      )}
      renderFooter={({ compact: isCompact }) => (
        <FooterItem
          compact={isCompact}
          item={{
            id: 'logout',
            title: 'Выход',
            icon: ArrowRightFromSquare,
            onItemClick: () => logout(),
          }}
        />
      )}
    />
  );
}

import {
  AuditOutlined,
  DashboardOutlined,
  DollarOutlined,
  HomeOutlined,
  OrderedListOutlined,
  ScanOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useSession } from './session';

const { Header, Content, Sider } = Layout;
const mobileItems = [
  { key: '/', icon: <HomeOutlined/>, text: 'Trang chủ' },
  { key: '/scan', icon: <ScanOutlined/>, text: 'Quét QR' },
  { key: '/orders', icon: <OrderedListOutlined/>, text: 'Đơn hàng' },
  { key: '/profile', icon: <UserOutlined/>, text: 'Tài khoản' },
];
const operations = [
  { key: '/dashboard', icon: <DashboardOutlined/>, text: 'Tổng quan' },
  { key: '/orders', icon: <OrderedListOutlined/>, text: 'Đơn hàng' },
  { key: '/customers', icon: <TeamOutlined/>, text: 'Khách hàng' },
  { key: '/expenses', icon: <DollarOutlined/>, text: 'Chi phí' },
  { key: '/shifts', icon: <OrderedListOutlined/>, text: 'Chốt ca' },
];
const management = [
  { key: '/users', icon: <UserSwitchOutlined/>, text: 'Nhân viên', ownerOnly: true },
  { key: '/services', icon: <ToolOutlined/>, text: 'Bảng giá' },
  { key: '/audit-logs', icon: <AuditOutlined/>, text: 'Audit log' },
  { key: '/settings', icon: <SettingOutlined/>, text: 'Cài đặt', ownerOnly: true },
];
const staffDesktop = [
  { key: '/', icon: <HomeOutlined/>, text: 'Trang chủ' },
  { key: '/scan', icon: <ScanOutlined/>, text: 'Quét QR' },
  { key: '/orders', icon: <OrderedListOutlined/>, text: 'Đơn hàng' },
  { key: '/customers', icon: <TeamOutlined/>, text: 'Khách hàng' },
  { key: '/profile', icon: <UserOutlined/>, text: 'Tài khoản' },
];

export function App() {
  const location = useLocation();
  const session = useSession();
  const isStaff = session.data?.role === 'STAFF';
  const desktopItems = isStaff
    ? staffDesktop
    : [...operations, ...management.filter((item) => !item.ownerOnly || session.data?.role === 'OWNER')];
  const selected = desktopItems.find((item) => item.key !== '/' && location.pathname.startsWith(item.key))?.key
    ?? (location.pathname === '/' ? '/' : undefined);
  const menuItems = isStaff
    ? desktopItems.map((item) => ({ key: item.key, icon: item.icon, label: <Link to={item.key}>{item.text}</Link> }))
    : [
      { type: 'group' as const, label: 'Vận hành', children: operations.map((item) => ({ key: item.key, icon: item.icon, label: <Link to={item.key}>{item.text}</Link> })) },
      { type: 'group' as const, label: 'Quản lý', children: management.filter((item) => !item.ownerOnly || session.data?.role === 'OWNER').map((item) => ({ key: item.key, icon: item.icon, label: <Link to={item.key}>{item.text}</Link> })) },
    ];

  return <Layout className="app-layout">
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <Sider width={240} className="desktop-nav">
      <Link to={isStaff ? '/' : '/dashboard'} className="brand nav-brand">ZUZU</Link>
      <Menu mode="inline" selectedKeys={selected ? [selected] : []} items={menuItems}/>
    </Sider>
    <Layout>
      <Header className="app-header">
        <Link to="/" className="mobile-brand">ZUZU</Link>
        <span className="current-user">{session.data?.name}</span>
      </Header>
      <Content id="main-content" className={`content ${isStaff ? 'staff-content' : 'management-content'}`}>
        <Outlet/>
      </Content>
      <nav className="mobile-nav" aria-label="Điều hướng chính">
        {mobileItems.map((item) => <Link
          key={item.key}
          to={item.key}
          className={selected === item.key ? 'active' : ''}
          aria-current={selected === item.key ? 'page' : undefined}
        >
          {item.icon}
          <small>{item.text}</small>
        </Link>)}
      </nav>
    </Layout>
  </Layout>;
}

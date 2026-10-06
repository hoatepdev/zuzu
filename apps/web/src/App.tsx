import {
  Banknote,
  ClipboardList,
  History,
  Home,
  LayoutDashboard,
  PanelLeft,
  ScanLine,
  ScrollText,
  Settings,
  Users,
  UserCog,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ZuzuWordmark } from "./components/common";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSession } from "./session";

const staffMobileItems = [
  { key: "/staff", icon: <Home />, text: "Trang chủ" },
  { key: "/scan", icon: <ScanLine />, text: "Quét QR" },
  { key: "/orders", icon: <ScrollText />, text: "Đơn hàng" },
  { key: "/customers", icon: <Users />, text: "Khách hàng" },
  { key: "/settings", icon: <Settings />, text: "Kết nối Zalo" },
];
const managementMobileItems = [
  { key: "/dashboard", icon: <LayoutDashboard />, text: "Tổng quan" },
  { key: "/orders", icon: <ScrollText />, text: "Đơn hàng" },
  { key: "/customers", icon: <Users />, text: "Khách hàng" },
  { key: "/expenses", icon: <Banknote />, text: "Chi phí" },
];

function mobileItemsFor(role?: string) {
  return role === "STAFF" ? staffMobileItems : managementMobileItems;
}

const mobileHomeFor = (role?: string) =>
  role === "STAFF" ? "/staff" : "/dashboard";

const mobileKeyFor = (pathname: string, items: typeof staffMobileItems) =>
  items.find(
    (item) =>
      item.key !== "/" &&
      item.key !== "/dashboard" &&
      pathname.startsWith(item.key),
  )?.key ??
  (items.some((item) => item.key === pathname) ? pathname : undefined);

const operations = [
  { key: "/dashboard", icon: <LayoutDashboard />, text: "Tổng quan" },
  { key: "/orders", icon: <ScrollText />, text: "Đơn hàng" },
  { key: "/customers", icon: <Users />, text: "Khách hàng" },
  { key: "/expenses", icon: <Banknote />, text: "Chi phí" },
  { key: "/shifts", icon: <History />, text: "Chốt ca" },
];
const management = [
  {
    key: "/users",
    icon: <UserCog />,
    text: "Nhân viên",
    ownerOnly: true,
  },
  { key: "/services", icon: <Wrench />, text: "Bảng giá" },
  { key: "/audit-logs", icon: <ClipboardList />, text: "Audit log" },
  {
    key: "/settings",
    icon: <Settings />,
    text: "Cài đặt",
    ownerOnly: true,
  },
];
const staffDesktop = [
  { key: "/staff", icon: <Home />, text: "Trang chủ" },
  { key: "/scan", icon: <ScanLine />, text: "Quét QR" },
  { key: "/orders", icon: <ScrollText />, text: "Đơn hàng" },
  { key: "/customers", icon: <Users />, text: "Khách hàng" },
  { key: "/settings", icon: <Settings />, text: "Kết nối Zalo" },
];

const roleLabels: Record<string, string> = {
  OWNER: "Chủ cửa hàng",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
};
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

function NavigationGroups({
  groups,
  selected,
  onNavigate,
}: {
  groups: Array<{ label?: string; items: typeof operations }>;
  selected?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Điều hướng chính">
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="nav-group">
          {group.label && <div className="nav-group-label">{group.label}</div>}
          {group.items.map((item) => (
            <Link
              key={item.key}
              to={item.key}
              className={`nav-item ${selected === item.key ? "active" : ""}`}
              aria-current={selected === item.key ? "page" : undefined}
              onClick={onNavigate}
            >
              {item.icon}
              {item.text}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function App() {
  const location = useLocation();
  const session = useSession();
  const role = session.data?.role;
  const isStaff = role === "STAFF";
  const [navigationOpen, setNavigationOpen] = useState(false);
  const desktopGroups: Array<{ label?: string; items: typeof operations }> =
    isStaff
      ? [{ items: staffDesktop }]
      : [
          { label: "Vận hành", items: operations },
          {
            label: "Quản lý",
            items: management.filter(
              (item) => !item.ownerOnly || role === "OWNER",
            ),
          },
        ];
  const desktopItems = desktopGroups.flatMap((group) => group.items);
  const selected =
    desktopItems.find(
      (item) => item.key !== "/" && location.pathname.startsWith(item.key),
    )?.key ??
    (location.pathname === mobileHomeFor(role)
      ? mobileHomeFor(role)
      : undefined);
  const mobileItems = mobileItemsFor(role);
  const mobileSelected =
    mobileKeyFor(location.pathname, mobileItems) ??
    (location.pathname === mobileHomeFor(role)
      ? mobileHomeFor(role)
      : undefined);

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <aside className="side-nav">
        <Link
          to={isStaff ? "/staff" : "/dashboard"}
          className="side-brand"
          aria-label="ZUZU — về trang chính"
        >
          <ZuzuWordmark light />
        </Link>
        <NavigationGroups groups={desktopGroups} selected={selected} />
        <Link to="/profile" className="side-user">
          <span className="avatar" aria-hidden="true">
            {initials(session.data?.name)}
          </span>
          <span>
            <b>{session.data?.name}</b>
            <small>{role ? roleLabels[role] : ""}</small>
          </span>
        </Link>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          {!isStaff && (
            <Button
              className="topbar-menu"
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Mở điều hướng"
              aria-expanded={navigationOpen}
              onClick={() => setNavigationOpen(true)}
            >
              <PanelLeft />
            </Button>
          )}
          <Link
            to={isStaff ? "/staff" : "/dashboard"}
            aria-label="ZUZU — về trang chính"
          >
            <ZuzuWordmark />
          </Link>
          <Link to="/profile" className="topbar-user" aria-label="Tài khoản">
            <span className="avatar" aria-hidden="true">
              {initials(session.data?.name)}
            </span>
            <b>{session.data?.name}</b>
          </Link>
        </header>
        {!isStaff && (
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetContent side="left" className="nav-drawer">
              <SheetHeader>
                <SheetTitle asChild>
                  <span>
                    <ZuzuWordmark />
                  </span>
                </SheetTitle>
              </SheetHeader>
              <div className="nav-drawer-body">
                <NavigationGroups
                  groups={desktopGroups}
                  selected={selected}
                  onNavigate={() => setNavigationOpen(false)}
                />
                <Link
                  to="/profile"
                  className="drawer-user"
                  onClick={() => setNavigationOpen(false)}
                >
                  <span className="avatar" aria-hidden="true">
                    {initials(session.data?.name)}
                  </span>
                  <span>
                    <b>{session.data?.name}</b>
                    <small>{role ? roleLabels[role] : ""}</small>
                  </span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        )}
        <main
          id="main-content"
          className={`content ${isStaff ? "staff-content" : "management-content"} ${location.pathname === "/staff" ? "home-content" : ""} ${location.pathname === "/receive" ? "receive-content" : ""}`}
        >
          <Outlet />
        </main>
        <nav
          className={`bottom-nav ${!isStaff ? "manager-bottom-nav" : ""}`}
          aria-label="Điều hướng chính"
        >
          {mobileItems.map((item) => (
            <Link
              key={item.key}
              to={item.key}
              className={mobileSelected === item.key ? "active" : ""}
              aria-current={mobileSelected === item.key ? "page" : undefined}
            >
              <span className="bn-icon" aria-hidden="true">
                {item.icon}
              </span>
              <small>{item.text}</small>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

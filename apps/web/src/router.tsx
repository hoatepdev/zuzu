import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AttachCustomerPage } from "./pages/AttachCustomerPage";
import { CompletePage } from "./pages/CompletePage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { CustomersPage } from "./pages/CustomersPage";
import { ExpenseFormPage } from "./pages/ExpenseFormPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { OrderPage } from "./pages/OrderPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReceivePage } from "./pages/ReceivePage";
import { ScanPage } from "./pages/ScanPage";
import { RequireAuth, RequireManager, RequireOwner } from "./session";

const AdminProviders = lazy(() =>
  import("./AdminProviders").then((module) => ({
    default: module.AdminProviders,
  })),
);
const LandingPage = lazy(() =>
  import("./landing/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const ExpensesPage = lazy(() =>
  import("./pages/ExpensesPage").then((module) => ({
    default: module.ExpensesPage,
  })),
);
const AuditLogPage = lazy(() =>
  import("./pages/AuditLogPage").then((module) => ({
    default: module.AuditLogPage,
  })),
);
const ShiftsPage = lazy(() =>
  import("./pages/ShiftsPage").then((module) => ({
    default: module.ShiftsPage,
  })),
);
const ServicesPage = lazy(() =>
  import("./pages/ServicesPage").then((module) => ({
    default: module.ServicesPage,
  })),
);
const UsersPage = lazy(() =>
  import("./pages/UsersPage").then((module) => ({
    default: module.UsersPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

const loading = <div aria-live="polite">Đang tải...</div>;
const lazyPage = (page: React.ReactNode) => (
  <Suspense fallback={<div className="center">Đang tải...</div>}>
    {page}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={loading}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    element: (
      <Suspense fallback={loading}>
        <AdminProviders />
      </Suspense>
    ),
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <App />,
            children: [
              { path: "staff", element: <HomePage /> },
              { path: "receive", element: <ReceivePage /> },
              { path: "scan", element: <ScanPage /> },
              { path: "orders", element: <OrdersPage /> },
              { path: "orders/:id", element: <OrderPage /> },
              { path: "orders/:id/complete", element: <CompletePage /> },
              {
                path: "orders/:id/attach-customer",
                element: <AttachCustomerPage />,
              },
              { path: "expenses/new", element: <ExpenseFormPage /> },
              { path: "customers", element: <CustomersPage /> },
              { path: "customers/:id", element: <CustomerDetailPage /> },
              { path: "profile", element: <ProfilePage /> },
              {
                element: <RequireManager />,
                children: [
                  { path: "dashboard", element: lazyPage(<DashboardPage />) },
                  { path: "expenses", element: lazyPage(<ExpensesPage />) },
                  { path: "audit-logs", element: lazyPage(<AuditLogPage />) },
                  { path: "shifts", element: lazyPage(<ShiftsPage />) },
                  { path: "services", element: lazyPage(<ServicesPage />) },
                ],
              },
              { path: "settings", element: lazyPage(<SettingsPage />) },
              {
                element: <RequireOwner />,
                children: [{ path: "users", element: lazyPage(<UsersPage />) }],
              },
            ],
          },
        ],
      },
    ],
  },
]);

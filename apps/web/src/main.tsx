import "@ant-design/v5-patch-for-react-19";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import "antd/dist/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./styles.css";

dayjs.locale("vi");

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000 } },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#0E7C66",
          colorPrimaryHover: "#0A5F4F",
          colorPrimaryActive: "#084A3D",
          colorSuccess: "#217A43",
          colorWarning: "#96650A",
          colorError: "#C0392B",
          colorText: "#1A2420",
          colorTextSecondary: "#46534C",
          colorTextTertiary: "#8A948C",
          colorBorder: "#DCD4C2",
          colorBorderSecondary: "#EAE4D6",
          colorBgLayout: "#F7F3EA",
          colorBgContainer: "#FFFFFF",
          colorBgElevated: "#FFFFFF",
          colorLink: "#0A5F4F",
          borderRadius: 12,
          borderRadiusLG: 16,
          fontSize: 16,
          controlHeight: 44,
          controlHeightLG: 52,
          controlHeightSM: 38,
          fontFamily:
            '"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          boxShadow: "0 1px 2px rgba(26,36,32,.05)",
          boxShadowSecondary:
            "0 2px 6px rgba(26,36,32,.06), 0 12px 32px rgba(26,36,32,.1)",
        },
        components: {
          Button: {
            fontWeight: 600,
            controlHeightLG: 54,
            primaryShadow: "none",
            defaultShadow: "none",
            dangerShadow: "none",
          },
          Input: {
            controlHeightLG: 54,
            activeShadow: "0 0 0 3px rgba(14,124,102,.14)",
          },
          InputNumber: { controlHeightLG: 54 },
          Select: { controlHeightLG: 54, optionSelectedBg: "#E3F0EA" },
          Modal: { borderRadiusLG: 18, paddingContentHorizontalLG: 24 },
          Table: {
            headerBg: "#F6F1E6",
            headerColor: "#46534C",
            headerSplitColor: "transparent",
            rowHoverBg: "#F7F3EA",
            cellPaddingBlock: 14,
            cellFontSize: 15,
          },
          Checkbox: { borderRadiusSM: 5 },
          Radio: { borderRadiusSM: 12 },
          DatePicker: { controlHeightLG: 54 },
          Alert: { borderRadiusLG: 14 },
          Card: { borderRadiusLG: 16 },
          Segmented: { itemSelectedBg: "#FFFFFF" },
          Popconfirm: { borderRadiusLG: 14 },
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);

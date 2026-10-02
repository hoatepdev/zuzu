import '@ant-design/v5-patch-for-react-19';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './styles.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000 } } });
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={{
      token: {
        colorPrimary: '#0369a1',
        colorSuccess: '#166534',
        colorWarning: '#92400e',
        colorError: '#b91c1c',
        colorText: '#0f172a',
        colorTextSecondary: '#475569',
        colorBorder: '#cbd5e1',
        colorBgLayout: '#f8fafc',
        colorBgContainer: '#ffffff',
        borderRadius: 10,
        fontSize: 16,
        controlHeight: 44,
        controlHeightLG: 52,
        controlHeightSM: 36,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Arial, sans-serif'
      },
      components: {
        Button: { controlHeightLG: 52, fontWeight: 700 },
        Input: { controlHeightLG: 52 },
        InputNumber: { controlHeightLG: 52 },
        Select: { controlHeightLG: 52 }
      }
    }}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router}/>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);

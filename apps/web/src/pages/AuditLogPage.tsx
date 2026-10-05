import { useQuery } from "@tanstack/react-query";
import { Alert, DatePicker, Select, Table, Tag } from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import { api } from "../api/client";
import { AuditLog, Page } from "../api/types";
import { PageHeader } from "../components/common";

const entityOptions = [
  "ORDER",
  "CUSTOMER",
  "EXPENSE",
  "USER",
  "SERVICE",
  "SHIFT",
  "STORE_SETTING",
].map((value) => ({ value, label: value }));
export function AuditLogPage() {
  const [entityType, setEntityType] = useState<string>();
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (entityType) params.set("entityType", entityType);
  if (dates?.[0]) params.set("from", dates[0].startOf("day").toISOString());
  if (dates?.[1]) params.set("to", dates[1].endOf("day").toISOString());
  const query = useQuery({
    queryKey: [
      "audit-logs",
      page,
      entityType,
      dates?.[0]?.format("YYYY-MM-DD"),
      dates?.[1]?.format("YYYY-MM-DD"),
    ],
    queryFn: () => api<Page<AuditLog>>(`/audit-logs?${params}`),
  });

  return (
    <>
      <PageHeader sub="Lịch sử thao tác trên hệ thống">Audit log</PageHeader>
      <div className="filter-bar">
        <Select
          size="large"
          allowClear
          placeholder="Loại dữ liệu"
          options={entityOptions}
          value={entityType}
          onChange={(value) => {
            setEntityType(value);
            setPage(1);
          }}
        />
        <DatePicker.RangePicker
          size="large"
          format="DD/MM/YYYY"
          value={dates}
          onChange={(value) => {
            setDates(value);
            setPage(1);
          }}
        />
      </div>
      {query.error && (
        <Alert type="error" message={query.error.message} showIcon />
      )}
      <Table
        className="management-table"
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.items}
        pagination={{
          current: page,
          total: query.data?.total,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
        }}
        scroll={{ x: 780 }}
        columns={[
          {
            title: "Thời gian",
            dataIndex: "createdAt",
            render: (value) => new Date(value).toLocaleString("vi-VN"),
          },
          { title: "Người thao tác", render: (_, row) => row.user.name },
          {
            title: "Loại",
            dataIndex: "entityType",
            render: (value) => <Tag>{value}</Tag>,
          },
          { title: "Hành động", dataIndex: "action" },
          { title: "Mã dữ liệu", dataIndex: "entityId" },
        ]}
      />
    </>
  );
}

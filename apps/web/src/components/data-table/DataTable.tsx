import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, Pager } from "../common";

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  page?: number;
  total?: number;
  pageSize?: number;
  loading?: boolean;
  emptyDescription?: string;
  manualPagination?: boolean;
  manualFiltering?: boolean;
  manualSorting?: boolean;
  onPageChange?: (page: number) => void;
  onGlobalFilterChange?: (value: string) => void;
  onRowClick?: (row: TData) => void;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  page = 1,
  total,
  pageSize = 20,
  loading = false,
  emptyDescription = "Chưa có dữ liệu",
  manualPagination = false,
  manualFiltering = false,
  manualSorting = false,
  onPageChange,
  onGlobalFilterChange,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: Math.max(0, page - 1),
    pageSize,
  });
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    manualPagination,
    manualFiltering,
    manualSorting,
    pageCount: manualPagination && total != null ? Math.ceil(total / pageSize) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;

  useEffect(() => {
    setPagination((current: PaginationState) => ({
      ...current,
      pageIndex: Math.max(0, page - 1),
    }));
  }, [page]);

  return (
    <div className="table-wrap">
      {onGlobalFilterChange && (
        <div className="data-table-toolbar">
          <Input
            value={globalFilter}
            onChange={(event) => {
              const value = event.target.value;
              setGlobalFilter(value);
              onGlobalFilterChange?.(value);
            }}
            placeholder="Lọc bảng"
            aria-label="Lọc bảng"
          />
        </div>
      )}
      <Table className="management-table">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="data-table-sort"
                      onClick={header.column.getToggleSortingHandler()}
                      disabled={!header.column.getCanSort()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        header.column.getIsSorted() === "asc" ? <ArrowUp /> :
                        header.column.getIsSorted() === "desc" ? <ArrowDown /> : <ChevronsUpDown />
                      )}
                    </Button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            [...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={columns.length}>
                  <Skeleton className="skeleton-line" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? "row-click" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row.original)}
                onKeyDown={(event) => {
                  if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onRowClick(row.original);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}><EmptyState description={emptyDescription} /></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {manualPagination && onPageChange && total != null ? (
        <Pager page={page} total={total} limit={pageSize} onChange={onPageChange} />
      ) : null}
    </div>
  );
}

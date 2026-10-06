import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../api/client";
import { Service } from "../api/types";
import {
  Banner,
  Money,
  NumberField,
  PageHeader,
  SelectField,
  Spinner,
  SwitchField,
  TextField,
} from "../components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ServiceForm = {
  stt: number;
  name: string;
  unit: "KG" | "ITEM" | "PAIR";
  price: number;
  isDefault: boolean;
  active?: boolean;
};

export function ServicesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Service>>();
  const form = useForm<ServiceForm>();
  const query = useQuery({
    queryKey: ["services", "all"],
    queryFn: () => api<Service[]>("/services/all"),
  });
  const save = useMutation({
    mutationFn: (values: ServiceForm) =>
      editing?.id
        ? api<Service>(`/services/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(values),
          })
        : api<Service>("/services", {
            method: "POST",
            body: JSON.stringify(values),
          }),
    onSuccess: () => {
      setEditing(undefined);
      void qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Đã lưu bảng giá");
    },
  });
  const edit = (service?: Service) => {
    setEditing(service ?? {});
    form.reset(
      service
        ? {
            stt: service.stt,
            name: service.name,
            unit: service.unit,
            price: Number(service.price),
            isDefault: service.isDefault,
            active: service.active,
          }
        : {
            stt: (query.data?.length ?? 0) + 1,
            name: "",
            unit: "KG",
            price: undefined as unknown as number,
            isDefault: false,
            active: true,
          },
    );
  };

  return (
    <>
      <PageHeader
        sub="Dịch vụ và đơn giá"
        extra={
          <Button onClick={() => edit()}>+ DỊCH VỤ</Button>
        }
      >
        Bảng giá
      </PageHeader>
      {query.error && <Banner tone="error" title={query.error.message} />}
      {save.error && <Banner tone="error" title={save.error.message} />}
      {query.error ? null : query.isLoading ? (
        <div className="center">
          <Spinner className="size-6" />
        </div>
      ) : (
        <div className="table-wrap">
          <Table className="management-table">
            <TableHeader>
              <TableRow>
                <TableHead>STT</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Mặc định chọn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data ?? []).map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.stt}</TableCell>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>
                    {service.unit === "KG"
                      ? "Kg"
                      : service.unit === "PAIR"
                        ? "Đôi"
                        : "Món"}
                  </TableCell>
                  <TableCell>
                    <Money value={service.price} />
                  </TableCell>
                  <TableCell>
                    {service.isDefault && (
                      <Badge className="status-badge st-COMPLETED">
                        Mặc định
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`status-badge ${service.active ? "st-PROCESSING" : "st-CANCELLED"}`}
                    >
                      {service.active ? "Đang dùng" : "Đã tắt"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => edit(service)}>
                      Sửa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa dịch vụ" : "Thêm dịch vụ"}</DialogTitle>
          </DialogHeader>
          <form
            className="task-form"
            onSubmit={form.handleSubmit((values) => {
              const { active, ...rest } = values;
              save.mutate(editing?.id ? { ...rest, active } : rest);
            })}
          >
            <NumberField
              control={form.control}
              name="stt"
              label="STT"
              min={1}
              quickThousand={false}
              rules={{ required: "Nhập STT" }}
            />
            <TextField
              control={form.control}
              name="name"
              label="Tên"
              className="input-lg"
              rules={{ required: "Nhập tên dịch vụ" }}
            />
            <SelectField
              control={form.control}
              name="unit"
              label="Đơn vị"
              options={[
                { value: "KG", label: "Kg" },
                { value: "ITEM", label: "Món" },
                { value: "PAIR", label: "Đôi" },
              ]}
              rules={{ required: "Chọn đơn vị" }}
            />
            <NumberField
              control={form.control}
              name="price"
              label="Giá"
              min={1}
              suffix="đ"
              rules={{ required: "Nhập giá" }}
            />
            <SwitchField
              control={form.control}
              name="isDefault"
              label="Mặc định chọn"
            />
            {editing?.id && (
              <SwitchField
                control={form.control}
                name="active"
                label="Đang sử dụng"
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

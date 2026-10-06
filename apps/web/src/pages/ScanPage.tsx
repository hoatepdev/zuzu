import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrScanner } from "../components/QrScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ScanPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const open = useCallback(
    (value: string) =>
      navigate(`/orders/${encodeURIComponent(value.trim().toUpperCase())}`),
    [navigate],
  );

  return (
    <div className="scanner-page">
      <h1 className="sr-only">Quét QR tra đơn</h1>
      <QrScanner onScan={open} />
      <section className="scanner-foot" aria-label="Tìm đơn bằng mã">
        <div className="divider">Hoặc nhập mã đơn</div>
        <form
          className="manual-code-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim()) open(code);
          }}
        >
          <Input
            className="input-lg"
            autoCapitalize="characters"
            placeholder="Ví dụ: ZU-0182"
            aria-label="Nhập mã đơn"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button type="submit" size="lg" className="manual-code-button">
            Tìm đơn
          </Button>
        </form>
      </section>
    </div>
  );
}

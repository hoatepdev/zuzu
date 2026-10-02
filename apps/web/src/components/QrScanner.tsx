import { Alert, Button } from "antd";
import QrScannerLibrary from "qr-scanner";
import { useEffect, useRef, useState } from "react";

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScannerLibrary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!video.current) return;
    let disposed = false;
    const instance = new QrScannerLibrary(
      video.current,
      (result) => {
        if (disposed) return;
        navigator.vibrate?.(80);
        instance.stop();
        onScan(result.data);
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: false,
        highlightCodeOutline: false,
        returnDetailedScanResult: true,
      },
    );
    scanner.current = instance;
    void instance.start().catch(() => {
      if (!disposed)
        setError("Không mở được camera. Hãy cho phép camera hoặc nhập mã đơn.");
    });
    return () => {
      disposed = true;
      instance.destroy();
      scanner.current = null;
    };
  }, [onScan]);

  const retry = () => {
    setError("");
    void scanner.current
      ?.start()
      .catch(() =>
        setError("Không mở được camera. Hãy cho phép camera hoặc nhập mã đơn."),
      );
  };

  return (
    <div className="scanner-shell">
      {error && (
        <div className="scanner-foot">
          <Alert
            type="warning"
            message={error}
            showIcon
            action={<Button onClick={retry}>Thử lại</Button>}
          />
        </div>
      )}
      <div className="scanner-viewport">
        <video
          ref={video}
          className="scanner"
          muted
          playsInline
          aria-label="Camera quét mã QR"
        />
        <div className="scan-frame" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <span className="scan-line" />
        </div>
        <p className="scan-hint">Đưa mã QR trên bill vào khung</p>
      </div>
      {!error && (
        <div className="scanner-retry">
          <Button onClick={retry}>Mở lại camera</Button>
        </div>
      )}
    </div>
  );
}

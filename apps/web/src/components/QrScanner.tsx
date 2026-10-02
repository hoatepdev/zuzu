import { Alert, Button } from "antd";
import QrScannerLibrary from "qr-scanner";
import { useEffect, useRef, useState } from "react";

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScannerLibrary | null>(null);
  const handled = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!video.current) return;
    let disposed = false;
    handled.current = false;
    const instance = new QrScannerLibrary(
      video.current,
      (result) => {
        if (disposed || handled.current) return;
        handled.current = true;
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
    handled.current = false;
    void scanner.current
      ?.start()
      .catch(() =>
        setError("Không mở được camera. Hãy cho phép camera hoặc nhập mã đơn."),
      );
  };

  return (
    <div className={`scanner-shell ${error ? "has-camera-error" : ""}`}>
      <div className="scanner-viewport">
        <video
          ref={video}
          className="scanner"
          muted
          playsInline
          aria-label="Camera quét mã QR"
        />
        {!error && (
          <>
            <div className="scan-frame" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <span className="scan-line" />
            </div>
            <p className="scan-hint">Đưa mã QR trên bill vào khung</p>
          </>
        )}
        {error && (
          <div className="camera-error">
            <Alert
              type="warning"
              message="Không mở được camera"
              description={error}
              showIcon
              action={
                <Button size="large" onClick={retry}>
                  THỬ LẠI
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

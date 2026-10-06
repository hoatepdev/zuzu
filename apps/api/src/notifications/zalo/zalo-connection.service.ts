import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
  LoginQRCallbackEventType,
  Zalo,
  type API,
  type LoginQRCallbackEvent,
} from "zca-js";
import {
  decryptZaloCredentials,
  encryptZaloCredentials,
  type ZaloCredentials,
} from "./zalo-crypto";

export type ZaloConnectionStatus =
  | "DISCONNECTED"
  | "WAITING_QR"
  | "SCANNED"
  | "CONNECTED"
  | "EXPIRED"
  | "ERROR";
export type ZaloAccount = {
  uid?: string;
  displayName: string;
  avatar?: string;
};
export type ZaloStatus = {
  status: ZaloConnectionStatus;
  qrImage?: string;
  account?: ZaloAccount;
  error?: string;
};

@Injectable()
export class ZaloConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ZaloConnectionService.name);
  private api?: API;
  private status: ZaloConnectionStatus = "DISCONNECTED";
  private qrImage?: string;
  private account?: ZaloAccount;
  private error?: string;
  private qrLogin?: Promise<void>;
  private pendingCredentials?: ZaloCredentials;
  private attempt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.ZALO_PROVIDER !== "zca") return;
    await this.restoreSession();
  }

  async onModuleDestroy() {
    this.api = undefined;
    this.qrLogin = undefined;
    this.pendingCredentials = undefined;
  }

  getStatus(): ZaloStatus {
    return {
      status: this.status,
      ...(this.qrImage ? { qrImage: this.qrImage } : {}),
      ...(this.account ? { account: this.account } : {}),
      ...(this.error ? { error: this.error } : {}),
    };
  }

  getApi() {
    if (!this.api || this.status !== "CONNECTED")
      throw new Error("Zalo chưa được kết nối");
    return this.api;
  }

  async startQrLogin() {
    if (
      this.status === "CONNECTED" ||
      this.status === "WAITING_QR" ||
      this.status === "SCANNED"
    )
      return this.getStatus();
    this.status = "WAITING_QR";
    this.qrImage = undefined;
    this.account = undefined;
    this.error = undefined;
    const attempt = ++this.attempt;
    this.qrLogin = this.runQrLogin(attempt);
    return this.getStatus();
  }

  async disconnect() {
    this.attempt += 1;
    this.api = undefined;
    this.qrImage = undefined;
    this.account = undefined;
    this.error = undefined;
    this.status = "DISCONNECTED";
    this.qrLogin = undefined;
    this.pendingCredentials = undefined;
    await this.prisma.integrationCredential.deleteMany({
      where: { provider: "ZALO" },
    });
    return this.getStatus();
  }

  private async restoreSession() {
    const row = await this.prisma.integrationCredential.findUnique({
      where: { provider: "ZALO" },
    });
    if (!row) return;
    try {
      const credentials = decryptZaloCredentials(row.encryptedData);
      const zalo = new Zalo({
        selfListen: false,
        checkUpdate: true,
        logging: false,
      });
      const api = await zalo.login(credentials);
      await this.markConnected(api);
    } catch (error) {
      this.api = undefined;
      this.status = "DISCONNECTED";
      this.error = "Không thể khôi phục kết nối Zalo. Vui lòng quét QR lại.";
      this.logger.warn(
        `zalo_restore_failed error=${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  private async runQrLogin(attempt: number) {
    try {
      const zalo = new Zalo({
        selfListen: false,
        checkUpdate: true,
        logging: false,
      });
      const api = await zalo.loginQR(
        {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        },
        (event) => this.handleQrEvent(event),
      );
      if (attempt !== this.attempt) return;
      if (this.pendingCredentials) {
        await this.prisma.integrationCredential.upsert({
          where: { provider: "ZALO" },
          update: {
            encryptedData: encryptZaloCredentials(this.pendingCredentials),
          },
          create: {
            provider: "ZALO",
            encryptedData: encryptZaloCredentials(this.pendingCredentials),
          },
        });
      }
      await this.markConnected(api);
    } catch (error) {
      if (this.status !== "EXPIRED") this.status = "ERROR";
      this.qrImage = undefined;
      this.error =
        this.status === "EXPIRED"
          ? "Mã QR đã hết hạn."
          : "Đăng nhập Zalo thất bại. Vui lòng thử lại.";
      this.logger.warn(
        `zalo_qr_login_failed error=${error instanceof Error ? error.message : "unknown"}`,
      );
    } finally {
      this.qrLogin = undefined;
      this.pendingCredentials = undefined;
    }
  }

  private handleQrEvent(event: LoginQRCallbackEvent) {
    switch (event.type) {
      case LoginQRCallbackEventType.QRCodeGenerated:
        this.status = "WAITING_QR";
        this.qrImage = `data:image/png;base64,${event.data.image}`;
        return;
      case LoginQRCallbackEventType.QRCodeScanned:
        this.status = "SCANNED";
        this.account = {
          displayName: event.data.display_name,
          avatar: event.data.avatar,
        };
        return;
      case LoginQRCallbackEventType.QRCodeExpired:
        this.status = "EXPIRED";
        this.qrImage = undefined;
        return;
      case LoginQRCallbackEventType.QRCodeDeclined:
        this.status = "ERROR";
        this.qrImage = undefined;
        this.error = "Đăng nhập Zalo đã bị từ chối.";
        return;
      case LoginQRCallbackEventType.GotLoginInfo:
        this.pendingCredentials = event.data;
    }
  }

  private async markConnected(api: API) {
    this.api = api;
    this.status = "CONNECTED";
    this.qrImage = undefined;
    this.error = undefined;
    try {
      const profile = (await api.fetchAccountInfo()).profile;
      this.account = {
        uid: profile.userId,
        displayName: profile.displayName,
        avatar: profile.avatar,
      };
    } catch {
      this.account = {
        uid: api.getOwnId(),
        displayName: this.account?.displayName ?? "Tài khoản Zalo",
        avatar: this.account?.avatar,
      };
    }
  }
}

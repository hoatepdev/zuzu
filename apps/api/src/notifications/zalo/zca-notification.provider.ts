import { Injectable } from '@nestjs/common';
import { ThreadType } from 'zca-js';
import type { NotificationProvider } from '../notifications.service';
import { normalizeZaloPhone } from './phone';
import { ZaloConnectionService } from './zalo-connection.service';

@Injectable()
export class ZcaNotificationProvider implements NotificationProvider {
  constructor(private readonly connection: ZaloConnectionService) {}

  async send(phone: string, message: string) {
    const api = this.connection.getApi();
    const user = await api.findUser(normalizeZaloPhone(phone));
    if (!user?.uid) throw new Error('Không tìm thấy tài khoản Zalo theo số điện thoại');
    await api.sendMessage({ msg: message }, user.uid, ThreadType.User);
  }
}

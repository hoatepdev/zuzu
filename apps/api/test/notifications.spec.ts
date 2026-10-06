import { ThreadType } from 'zca-js';
import { normalizeZaloPhone } from '../src/notifications/zalo/phone';
import { ZcaNotificationProvider } from '../src/notifications/zalo/zca-notification.provider';

describe('Zalo notifications', () => {
  it('normalizes Vietnamese phone formats', () => {
    expect(normalizeZaloPhone('0916 697 533')).toBe('0916697533');
    expect(normalizeZaloPhone('+84916697533')).toBe('0916697533');
    expect(normalizeZaloPhone('84916697533')).toBe('0916697533');
  });

  it('finds the user then sends a user-thread message', async () => {
    const sendMessage = jest.fn().mockResolvedValue(undefined);
    const api = { findUser: jest.fn().mockResolvedValue({ uid: 'uid-1' }), sendMessage };
    const provider = new ZcaNotificationProvider({ getApi: () => api } as never);
    await provider.send('+84916697533', 'hello');
    expect(api.findUser).toHaveBeenCalledWith('0916697533');
    expect(sendMessage).toHaveBeenCalledWith({ msg: 'hello' }, 'uid-1', ThreadType.User);
  });

  it('rejects a missing Zalo user', async () => {
    const provider = new ZcaNotificationProvider({ getApi: () => ({ findUser: jest.fn().mockResolvedValue(null) }) } as never);
    await expect(provider.send('0916697533', 'hello')).rejects.toThrow('Không tìm thấy tài khoản Zalo');
  });
});

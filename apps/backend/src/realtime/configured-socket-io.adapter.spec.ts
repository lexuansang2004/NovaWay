import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfiguredSocketIoAdapter } from './configured-socket-io.adapter';

describe('ConfiguredSocketIoAdapter', () => {
  it('overrides createIOServer cors with WEB_ORIGIN instead of any decorator-supplied value', () => {
    const configService = { get: jest.fn().mockReturnValue('http://localhost:5173') } as unknown as ConfigService;
    const superSpy = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue('fake-server' as never);

    const adapter = new ConfiguredSocketIoAdapter({} as never, configService);
    const result = adapter.createIOServer(0, { cors: true } as never);

    expect(configService.get).toHaveBeenCalledWith('WEB_ORIGIN');
    expect(superSpy).toHaveBeenCalledWith(0, {
      cors: { origin: 'http://localhost:5173', credentials: true },
    });
    expect(result).toBe('fake-server');

    superSpy.mockRestore();
  });
});

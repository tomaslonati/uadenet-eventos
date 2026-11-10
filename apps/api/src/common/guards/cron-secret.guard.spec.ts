import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';

const envMock: { CRON_SECRET?: string } = {};
jest.mock('@repo/env', () => ({ env: envMock }));

import { CronSecretGuard } from './cron-secret.guard';

const contexto = (authorization?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization ? { authorization } : {} }),
    }),
  }) as unknown as ExecutionContext;

describe('CronSecretGuard', () => {
  const guard = new CronSecretGuard();

  beforeEach(() => {
    envMock.CRON_SECRET = 's3creto';
  });

  it('deja pasar la invocación de Vercel con el secreto correcto', () => {
    expect(guard.canActivate(contexto('Bearer s3creto'))).toBe(true);
  });

  it('rechaza un secreto incorrecto', () => {
    expect(() => guard.canActivate(contexto('Bearer otro'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza si no viene el header', () => {
    expect(() => guard.canActivate(contexto())).toThrow(UnauthorizedException);
  });

  it('queda cerrado para todos si CRON_SECRET no está configurada', () => {
    envMock.CRON_SECRET = undefined;

    expect(() => guard.canActivate(contexto('Bearer '))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(contexto('Bearer undefined'))).toThrow(
      UnauthorizedException,
    );
  });
});

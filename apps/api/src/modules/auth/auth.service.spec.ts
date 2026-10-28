import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new AuthService();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('delega login a POST /api/v1/auth/login de CORE y devuelve accessToken + user', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'jwt-core-token',
          expiresIn: 900,
          user: {
            id: '3dc2f950-355b-4a86-9832-279ceae95d18',
            email: 'student@uade.edu.ar',
            careerIds: ['ing-informatica'],
            roles: ['STUDENT'],
            permissions: ['wallet:read:self', 'wallet:credit:self'],
            status: 'ACTIVE',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { respuesta } = await service.login({
      email: 'student@uade.edu.ar',
      password: 'StrongPass123!',
    });

    expect(respuesta.accessToken).toBe('jwt-core-token');
    expect(respuesta.user.email).toBe('student@uade.edu.ar');
    expect(respuesta.user.roles).toEqual(['STUDENT']);
  });

  it('rechaza con 401 cuando CORE responde 401 y no es cuenta demo válida', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'AUTH_INVALID_CREDENTIALS' }), {
        status: 401,
      }),
    );

    await expect(
      service.login({
        email: 'desconocido@uade.edu.ar',
        password: 'WrongPassword123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

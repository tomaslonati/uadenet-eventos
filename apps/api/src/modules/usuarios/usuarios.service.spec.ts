import type { BackofficeClient } from '../../common/backoffice/backoffice.client';
import { USUARIO_DEMO_ID } from '../../common/usuario-demo';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let obtenerUsuarioMock: jest.Mock;
  let service: UsuariosService;

  beforeEach(() => {
    obtenerUsuarioMock = jest.fn((id: string) =>
      Promise.resolve({
        id,
        nombre: 'Mariana Ibarra',
        email: 'm.ibarra@uadenet.edu',
        rol: 'administrativo',
        sede: 'Sede Centro',
      }),
    );
    service = new UsuariosService({
      obtenerUsuario: obtenerUsuarioMock,
    } as unknown as BackofficeClient);
  });

  it('obtiene el usuario logueado usando el ID demo', async () => {
    const usuario = await service.obtenerActual();
    expect(usuario.id).toBe(USUARIO_DEMO_ID);
    expect(obtenerUsuarioMock).toHaveBeenCalledWith(USUARIO_DEMO_ID);
  });

  it('obtiene un usuario específico por su ID', async () => {
    const usuario = await service.obtener('u-custom');
    expect(usuario.id).toBe('u-custom');
    expect(obtenerUsuarioMock).toHaveBeenCalledWith('u-custom');
  });
});

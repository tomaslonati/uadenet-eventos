import { Test, TestingModule } from '@nestjs/testing';
import type { CrearEvento, Evento } from '@repo/contracts';
import type { UsuarioAutenticado } from '../../common/usuario-demo';
import { EventosController } from './eventos.controller';
import { EventosGestionService } from './eventos-gestion.service';
import { EventosService } from './eventos.service';

describe('EventosController', () => {
  let controller: EventosController;
  let service: { crear: jest.Mock; listar: jest.Mock };
  let gestion: {
    actualizar: jest.Mock;
    cancelar: jest.Mock;
    impacto: jest.Mock;
  };

  const eventoEjemplo: Evento = {
    id: 'e1',
    titulo: 'Jornada de IA',
    descripcion: 'Descripción',
    locacionId: 'l1',
    cupoMaximo: 100,
    fechaInicio: new Date('2026-09-12T09:00:00Z'),
    fechaFin: new Date('2026-09-12T13:00:00Z'),
    esPago: false,
    categoriaPrecio: null,
    creadoPor: 'seed-admin-demo',
    estado: 'publicado',
    motivoCancelacion: null,
    reprogramadoEn: null,
  };

  beforeEach(async () => {
    service = { crear: jest.fn(), listar: jest.fn() };
    gestion = {
      actualizar: jest.fn(),
      cancelar: jest.fn(),
      impacto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosController],
      providers: [
        { provide: EventosService, useValue: service },
        { provide: EventosGestionService, useValue: gestion },
      ],
    }).compile();

    controller = module.get<EventosController>(EventosController);
  });

  it('delega la creación al service', async () => {
    service.crear.mockResolvedValue(eventoEjemplo);
    const datos: CrearEvento = {
      titulo: eventoEjemplo.titulo,
      descripcion: eventoEjemplo.descripcion,
      locacionId: eventoEjemplo.locacionId,
      cupoMaximo: eventoEjemplo.cupoMaximo,
      fechaInicio: eventoEjemplo.fechaInicio,
      fechaFin: eventoEjemplo.fechaFin,
      esPago: eventoEjemplo.esPago,
    };

    await expect(controller.crear(datos)).resolves.toEqual(eventoEjemplo);
    expect(service.crear).toHaveBeenCalledWith(datos);
  });

  it('delega el listado al service con el filtro de fechas', async () => {
    service.listar.mockResolvedValue([eventoEjemplo]);
    const filtro = { desde: new Date('2026-09-01T00:00:00Z') };

    await expect(controller.listar(filtro)).resolves.toEqual([eventoEjemplo]);
    expect(service.listar).toHaveBeenCalledWith(filtro);
  });

  it('delega la edición al service con el usuario autenticado', async () => {
    const resultado = { evento: eventoEjemplo, notificados: 0 };
    gestion.actualizar.mockResolvedValue(resultado);

    await expect(
      controller.actualizar('e1', { cupoMaximo: 80 }, {
        id: 'u1',
      } as UsuarioAutenticado),
    ).resolves.toEqual(resultado);
    expect(gestion.actualizar).toHaveBeenCalledWith(
      'e1',
      { cupoMaximo: 80 },
      'u1',
    );
  });

  it('delega la cancelación al service con el motivo y el usuario autenticado', async () => {
    gestion.cancelar.mockResolvedValue({ eventoId: 'e1' });

    await controller.cancelar('e1', { motivo: 'Se suspende por lluvia' }, {
      id: 'u1',
    } as UsuarioAutenticado);

    expect(gestion.cancelar).toHaveBeenCalledWith(
      'e1',
      'Se suspende por lluvia',
      'u1',
    );
  });

  it('delega el impacto de cancelar al service', async () => {
    gestion.impacto.mockResolvedValue({ eventoId: 'e1', inscriptos: 3 });

    await controller.impacto('e1', { id: 'u1' } as UsuarioAutenticado);

    expect(gestion.impacto).toHaveBeenCalledWith('e1', 'u1');
  });
});

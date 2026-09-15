import { Test, TestingModule } from '@nestjs/testing';
import type { CrearEvento, Evento } from '@repo/contracts';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

describe('EventosController', () => {
  let controller: EventosController;
  let service: { crear: jest.Mock; listar: jest.Mock };

  const eventoEjemplo: Evento = {
    id: 'e1',
    titulo: 'Jornada de IA',
    descripcion: 'Descripción',
    locacionId: 'l1',
    cupoMaximo: 100,
    fechaInicio: new Date('2026-09-12T09:00:00Z'),
    fechaFin: new Date('2026-09-12T13:00:00Z'),
    esPago: false,
    precio: null,
    creadoPor: 'seed-admin-demo',
  };

  beforeEach(async () => {
    service = { crear: jest.fn(), listar: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosController],
      providers: [{ provide: EventosService, useValue: service }],
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
});

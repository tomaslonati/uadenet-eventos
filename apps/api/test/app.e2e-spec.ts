import type { Server } from 'node:http';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.listen(0);
    const addr = app.getHttpServer().address();
    if (typeof addr === 'object' && addr) {
      process.env.PORT = String(addr.port);
    }
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health responde 200 ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/v1/sedes devuelve el listado de sedes consumido de Backoffice', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/sedes')
      .expect(200);

    const body = res.body as Array<{
      id: string;
      nombre: string;
    }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);
    expect(body[0]).toMatchObject({
      id: 'a1b2c3d4-0001-4a00-8000-000000000001',
      nombre: 'Sede Centro',
    });
  });

  it('GET /api/v1/usuarios/me devuelve los datos del usuario logueado desde Backoffice', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/usuarios/me')
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'seed-admin-demo',
      nombre: 'Mariana Ibarra',
      email: 'm.ibarra@uadenet.edu',
      rol: 'administrativo',
      sede: 'Sede Centro',
    });
  });

  it('GET /api/v1/usuarios/:id devuelve los datos del usuario por id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/usuarios/seed-alumno-demo')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: 'seed-alumno-demo',
          nombre: 'Tomás Vidal',
          rol: 'estudiante',
        });
      });
  });

  it('GET /api/v1/backoffice/sedes/:sedeId/espacios?aptoEventos=true filtra espacios por sede', async () => {
    const sedeCentroId = 'a1b2c3d4-0001-4a00-8000-000000000001';
    const res = await request(app.getHttpServer())
      .get(`/api/v1/backoffice/sedes/${sedeCentroId}/espacios?aptoEventos=true`)
      .expect(200);

    const body = res.body as Array<{
      sedeId: string;
      aptoEventos: boolean;
      estado: string;
    }>;
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((e) => e.sedeId === sedeCentroId && e.aptoEventos)).toBe(
      true,
    );
  });

  it('GET /api/v1/backoffice/tarifas/vigente devuelve la tarifa vigente por concepto y fecha', async () => {
    const resGeneral = await request(app.getHttpServer())
      .get(
        '/api/v1/backoffice/tarifas/vigente?concepto=EVENTO_INSCRIPCION_GENERAL&fecha=2026-10-20',
      )
      .expect(200);

    expect(resGeneral.body).toMatchObject({
      concepto: 'EVENTO_INSCRIPCION_GENERAL',
      monto: 5500,
      moneda: 'ARS',
    });

    const resEspecial = await request(app.getHttpServer())
      .get(
        '/api/v1/backoffice/tarifas/vigente?concepto=EVENTO_INSCRIPCION_ESPECIAL&fecha=2026-10-20',
      )
      .expect(200);

    expect(resEspecial.body).toMatchObject({
      concepto: 'EVENTO_INSCRIPCION_ESPECIAL',
      monto: 12500,
      moneda: 'ARS',
    });

    await request(app.getHttpServer())
      .get(
        '/api/v1/backoffice/tarifas/vigente?concepto=CONCEPTO_INVALIDO&fecha=2026-10-20',
      )
      .expect(404);
  });
});

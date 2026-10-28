import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { firmarJwtCore } from '../src/common/core/core-crypto';

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

  it('GET /api/v1/usuarios/me resuelve el usuario del JWT RS256 validado contra el JWKS de CORE', async () => {
    const jwtAlumno = firmarJwtCore({
      sub: 'seed-alumno-demo',
      email: 't.vidal@uadenet.edu',
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      careerIds: ['ing-informatica'],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/usuarios/me')
      .set('Authorization', `Bearer ${jwtAlumno}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'seed-alumno-demo',
      nombre: 'Tomás Vidal',
      email: 't.vidal@uadenet.edu',
      rol: 'estudiante',
      sede: 'Sede Centro',
    });
  });

  it('GET /api/v1/usuarios/me/saldo consulta el saldo institucional en CORE', async () => {
    const jwtAlumno = firmarJwtCore({
      sub: 'seed-alumno-demo',
      email: 't.vidal@uadenet.edu',
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/usuarios/me/saldo')
      .set('Authorization', `Bearer ${jwtAlumno}`)
      .expect(200);

    expect(res.body).toMatchObject({
      userId: 'seed-alumno-demo',
      balance: '10000.00',
      currency: 'ARS',
    });
    expect(typeof (res.body as { walletId?: string }).walletId).toBe('string');
    expect(typeof (res.body as { updatedAt?: string }).updatedAt).toBe(
      'string',
    );
  });

  it('POST /api/v1/auth/login autentica contra CORE y GET /api/v1/auth/me devuelve el perfil', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'm.ibarra@uadenet.edu',
        password: 'admin.2026',
      })
      .expect(200);

    const body = loginRes.body as {
      accessToken: string;
      expiresIn: number;
      user: { id: string; email: string; roles: string[] };
    };
    expect(typeof body.accessToken).toBe('string');
    expect(body.expiresIn).toBe(900);
    expect(body.user.email).toBe('m.ibarra@uadenet.edu');

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);

    expect(meRes.body).toMatchObject({
      id: 'seed-admin-demo',
      email: 'm.ibarra@uadenet.edu',
      roles: ['OPERATIONS_ADMIN'],
      status: 'ACTIVE',
    });
  });

  it('POST /api/v1/eventos rechaza con 403 cuando el JWT no posee el permiso campus-events:manage', async () => {
    const jwtAlumno = firmarJwtCore({
      sub: 'seed-alumno-demo',
      email: 't.vidal@uadenet.edu',
      roles: ['STUDENT'],
      permissions: ['wallet:read:self'],
    });

    await request(app.getHttpServer())
      .post('/api/v1/eventos')
      .set('Authorization', `Bearer ${jwtAlumno}`)
      .send({
        titulo: 'Intento sin permiso',
        descripcion: 'No debería autorizarse',
        locacionId: 'b0b0b0b0-0000-4000-8000-000000000001',
        cupoMaximo: 30,
        fechaInicio: '2026-11-10T10:00:00.000Z',
        fechaFin: '2026-11-10T12:00:00.000Z',
        esPago: false,
      })
      .expect(403);
  });

  it('CORE Wallets: debita con idempotencia, concilia por referencia y permite revertir', async () => {
    const idempotencyKey = randomUUID();
    const referencia = randomUUID();

    const debitoRes = await request(app.getHttpServer())
      .post('/api/v1/core/internal/v1/wallets/u-10432/debits')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        amount: '1800.00',
        currency: 'ARS',
        concept: 'EVENT_REGISTRATION',
        sourceModule: 'events',
        externalReference: referencia,
      })
      .expect(201);

    const tx = debitoRes.body as {
      transactionId: string;
      balanceAfter: string;
    };
    expect(tx.balanceAfter).toBe('8200.00');

    // Reintento idempotente con misma clave y mismo body devuelve exactamente la misma transacción
    const reintentoRes = await request(app.getHttpServer())
      .post('/api/v1/core/internal/v1/wallets/u-10432/debits')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        amount: '1800.00',
        currency: 'ARS',
        concept: 'EVENT_REGISTRATION',
        sourceModule: 'events',
        externalReference: referencia,
      })
      .expect(201);
    expect(reintentoRes.body).toEqual(debitoRes.body);

    // Conciliación por referencia
    const conciliarRes = await request(app.getHttpServer())
      .get(
        `/api/v1/core/internal/v1/wallet-transactions/by-reference?sourceModule=events&externalReference=${referencia}`,
      )
      .expect(200);
    expect(conciliarRes.body).toMatchObject({
      transactionId: tx.transactionId,
      status: 'POSTED',
    });

    // Reversa devuelve el saldo a 10000.00
    const reversaRes = await request(app.getHttpServer())
      .post(
        `/api/v1/core/internal/v1/wallet-transactions/${tx.transactionId}/reversals`,
      )
      .set('Idempotency-Key', randomUUID())
      .send({ reason: 'Cancelación técnica' })
      .expect(201);
    expect(reversaRes.body).toMatchObject({
      type: 'REVERSAL',
      balanceAfter: '10000.00',
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

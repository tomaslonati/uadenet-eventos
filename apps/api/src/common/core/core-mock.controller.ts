import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  coreEventEnvelopeSchema,
  coreIntrospectRequestSchema,
  coreLoginRequestSchema,
  coreNotificationRequestSchema,
  serviceTokenRequestSchema,
  walletDebitRequestSchema,
  walletReversalRequestSchema,
  walletTopUpRequestSchema,
  type CoreAuthUser,
  type CoreEventAck,
  type CoreEventEnvelope,
  type CoreIntrospectResponse,
  type CoreLoginResponse,
  type CoreNotification,
  type CoreNotificationRequest,
  type CoreNotificationsPage,
  type JwksResponse,
  type ServiceTokenResponse,
  type WalletBalance,
  type WalletTransaction,
  type WalletTransactionsPage,
} from '@repo/contracts';
import { USUARIO_DEMO_ID } from '../usuario-demo';
import { firmarJwtCore, obtenerJwkPublicaDemo } from './core-crypto';

const SALDO_INICIAL_PESOS = 10_000;

interface CuentaDemoCore {
  user: CoreAuthUser;
  nombre: string;
  password: string;
}

const CUENTAS_DEMO_CORE: CuentaDemoCore[] = [
  {
    user: {
      id: 'seed-admin-demo',
      email: 'm.ibarra@uadenet.edu',
      careerIds: [],
      roles: ['OPERATIONS_ADMIN'],
      permissions: [
        'campus-events:manage',
        'wallet:read:self',
        'wallet:credit:self',
      ],
      status: 'ACTIVE',
    },
    nombre: 'Mariana Ibarra',
    password: 'admin.2026',
  },
  {
    user: {
      id: 'seed-docente-demo',
      email: 'e.ruiz@uadenet.edu',
      careerIds: [],
      roles: ['TEACHER'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      status: 'ACTIVE',
    },
    nombre: 'Dr. Esteban Ruiz',
    password: 'docente.2026',
  },
  {
    user: {
      id: 'seed-alumno-demo',
      email: 't.vidal@uadenet.edu',
      careerIds: ['ing-informatica'],
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      status: 'ACTIVE',
    },
    nombre: 'Tomás Vidal',
    password: 'alumno.2026',
  },
  {
    user: {
      id: '3dc2f950-355b-4a86-9832-279ceae95d18',
      email: 'student@uade.edu.ar',
      careerIds: ['ing-informatica'],
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      status: 'ACTIVE',
    },
    nombre: 'Estudiante UADE',
    password: 'StrongPass123!',
  },
];

/**
 * CORE simulado sobre los contratos oficiales de G10 (Authentication, IAM/JWKS,
 * Wallets, Event Bus y Notificaciones). Solo se monta cuando `CORE_BASE_URL`
 * no está definido o en entorno de test; con `CORE_BASE_URL` configurado los
 * servicios consumen el CORE real.
 */
@ApiExcludeController()
@Controller({ path: 'core', version: '1' })
export class CoreMockController {
  private readonly saldos = new Map<string, number>();
  private readonly walletIds = new Map<string, string>();
  private readonly transaccionesPorId = new Map<string, WalletTransaction>();
  private readonly propietarioPorTransaccion = new Map<string, string>();
  private readonly transaccionesPorReferencia = new Map<
    string,
    WalletTransaction
  >();
  private readonly idempotencia = new Map<
    string,
    { fingerprint: string; transaccion: WalletTransaction }
  >();
  private readonly reversasPorTransaccion = new Map<
    string,
    WalletTransaction
  >();
  readonly eventosRecibidos: CoreEventEnvelope[] = [];
  readonly notificacionesRecibidas: CoreNotificationRequest[] = [];

  @Get('.well-known/jwks.json')
  jwks(): JwksResponse {
    return {
      keys: [obtenerJwkPublicaDemo()],
    };
  }

  @Post('api/v1/auth/login')
  @HttpCode(200)
  login(@Body() body: unknown): CoreLoginResponse {
    const parsed = coreLoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        detail: 'Credenciales inválidas.',
      });
    }

    const emailBuscado = parsed.data.email.trim().toLowerCase();
    const cuenta = CUENTAS_DEMO_CORE.find(
      (c) =>
        c.user.email.toLowerCase() === emailBuscado &&
        c.password === parsed.data.password,
    );

    if (!cuenta) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        detail: 'Invalid email or password',
      });
    }

    const accessToken = firmarJwtCore(
      {
        sub: cuenta.user.id,
        email: cuenta.user.email,
        nombre: cuenta.nombre,
        roles: cuenta.user.roles,
        permissions: cuenta.user.permissions,
        careerIds: cuenta.user.careerIds,
      },
      900,
    );

    return {
      accessToken,
      expiresIn: 900,
      user: cuenta.user,
    };
  }

  @Post('api/v1/auth/refresh')
  @HttpCode(200)
  refresh(@Headers('authorization') authHeader?: string): CoreLoginResponse {
    const sub = this.extraerSubDeAuth(authHeader) ?? 'seed-admin-demo';
    const cuenta =
      CUENTAS_DEMO_CORE.find((c) => c.user.id === sub) ?? CUENTAS_DEMO_CORE[0]!;

    const accessToken = firmarJwtCore(
      {
        sub: cuenta.user.id,
        email: cuenta.user.email,
        nombre: cuenta.nombre,
        roles: cuenta.user.roles,
        permissions: cuenta.user.permissions,
        careerIds: cuenta.user.careerIds,
      },
      900,
    );

    return {
      accessToken,
      expiresIn: 900,
      user: cuenta.user,
    };
  }

  @Post('api/v1/auth/logout')
  @HttpCode(204)
  logout(): void {
    return;
  }

  @Get('api/v1/auth/me')
  me(@Headers('authorization') authHeader?: string): CoreAuthUser {
    const sub = this.extraerSubDeAuth(authHeader);
    if (!sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        detail: 'Bearer token requerido.',
      });
    }
    const cuenta = CUENTAS_DEMO_CORE.find((c) => c.user.id === sub);
    if (cuenta) {
      return cuenta.user;
    }
    return {
      id: sub,
      email: `${sub}@uade.edu.ar`,
      careerIds: [],
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      status: 'ACTIVE',
    };
  }

  @Post('internal/v1/auth/introspect')
  @HttpCode(200)
  introspect(@Body() body: unknown): CoreIntrospectResponse {
    const parsed = coreIntrospectRequestSchema.safeParse(body);
    if (!parsed.success) {
      return { active: false };
    }
    const sub = this.extraerSubDeAuth(`Bearer ${parsed.data.token}`);
    if (!sub) {
      return { active: false };
    }
    return {
      active: true,
      sub,
      kind: sub.startsWith('service:') ? 'service' : 'user',
    };
  }

  @Post('internal/v1/service-auth/token')
  @HttpCode(200)
  emitirTokenServicio(@Body() body: unknown): ServiceTokenResponse {
    const parsed = serviceTokenRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_CLIENT_CREDENTIALS',
        detail: 'Credenciales de servicio inválidas.',
      });
    }

    const token = firmarJwtCore(
      {
        sub: parsed.data.clientId,
        roles: ['SERVICE'],
        permissions: [
          'events:publish',
          'wallet:debit:any',
          'notifications:write',
          'webhooks:manage',
        ],
      },
      900,
    );

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  @Get('api/v1/wallets/me')
  miBilletera(
    @Headers('x-user-id') headerUserId?: string,
    @Headers('authorization') authHeader?: string,
  ): WalletBalance {
    const userId =
      headerUserId ?? this.extraerSubDeAuth(authHeader) ?? USUARIO_DEMO_ID;
    return this.obtenerBalance(userId);
  }

  @Get('api/v1/wallets/me/transactions')
  misMovimientos(
    @Headers('x-user-id') headerUserId?: string,
    @Headers('authorization') authHeader?: string,
  ): WalletTransactionsPage {
    const userId =
      headerUserId ?? this.extraerSubDeAuth(authHeader) ?? USUARIO_DEMO_ID;
    const items = Array.from(this.transaccionesPorId.values())
      .filter(
        (tx) => this.propietarioPorTransaccion.get(tx.transactionId) === userId,
      )
      .reverse();
    return { items, nextCursor: null };
  }

  @Post('api/v1/wallets/me/top-ups')
  @HttpCode(201)
  recargarMiBilletera(
    @Headers('x-user-id') headerUserId?: string,
    @Headers('authorization') authHeader?: string,
    @Body() body?: unknown,
  ): WalletTransaction {
    const parsed = walletTopUpRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'WALLET_INVALID_AMOUNT',
        detail: 'Payload de recarga inválido.',
      });
    }
    const userId =
      headerUserId ?? this.extraerSubDeAuth(authHeader) ?? USUARIO_DEMO_ID;
    const monto = Number.parseFloat(parsed.data.amount);
    const nuevoSaldo = this.obtenerSaldoNumerico(userId) + monto;
    this.saldos.set(userId, nuevoSaldo);

    const tx: WalletTransaction = {
      transactionId: randomUUID(),
      status: 'POSTED',
      type: 'CREDIT',
      concept: 'TOP_UP',
      amount: monto.toFixed(2),
      currency: 'ARS',
      balanceAfter: nuevoSaldo.toFixed(2),
      externalReference: `topup/${randomUUID()}`,
      originalTransactionId: null,
      createdAt: new Date().toISOString(),
    };
    this.transaccionesPorId.set(tx.transactionId, tx);
    this.propietarioPorTransaccion.set(tx.transactionId, userId);
    return tx;
  }

  @Get('api/v1/notifications')
  misNotificaciones(
    @Headers('authorization') authHeader?: string,
  ): CoreNotificationsPage {
    const userId = this.extraerSubDeAuth(authHeader) ?? USUARIO_DEMO_ID;
    const items: CoreNotification[] = this.notificacionesRecibidas
      .filter((n) => n.userId === userId)
      .map((n) => ({
        id: randomUUID(),
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        actionUrl: n.actionUrl ?? null,
        sourceModule: n.sourceModule,
        sourceReference: n.sourceReference,
        readAt: null,
        expiresAt: n.expiresAt ?? null,
        createdAt: new Date().toISOString(),
      }));
    return { items, nextCursor: null };
  }

  @Get('internal/v1/wallets/:userId')
  billeteraDe(@Param('userId') userId: string): WalletBalance {
    return this.obtenerBalance(userId);
  }

  @Post('internal/v1/wallets/:userId/debits')
  @HttpCode(201)
  debitar(
    @Param('userId') userId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Body() body?: unknown,
  ): WalletTransaction {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        detail: 'El header Idempotency-Key es obligatorio.',
      });
    }

    const parsed = walletDebitRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'WALLET_INVALID_AMOUNT',
        detail: 'Payload de débito inválido.',
      });
    }

    const datos = parsed.data;
    const fingerprint = JSON.stringify({ userId, ...datos });
    const previoIdempotente = this.idempotencia.get(idempotencyKey);
    if (previoIdempotente) {
      if (previoIdempotente.fingerprint !== fingerprint) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          detail: 'La clave de idempotencia ya fue usada con otro payload.',
        });
      }
      return previoIdempotente.transaccion;
    }

    const claveReferencia = `${datos.sourceModule}:${datos.externalReference}`;
    const previoPorReferencia =
      this.transaccionesPorReferencia.get(claveReferencia);
    if (previoPorReferencia) {
      throw new ConflictException({
        code: 'DUPLICATE_REFERENCE',
        detail: 'Ya existe un movimiento para esa referencia externa.',
        meta: { transactionId: previoPorReferencia.transactionId },
      });
    }

    const monto = Number.parseFloat(datos.amount);
    const saldoActual = this.obtenerSaldoNumerico(userId);
    if (monto > saldoActual) {
      throw new UnprocessableEntityException({
        code: 'WALLET_INSUFFICIENT_FUNDS',
        detail: 'Saldo insuficiente en la cuenta institucional.',
      });
    }

    const nuevoSaldo = saldoActual - monto;
    this.saldos.set(userId, nuevoSaldo);

    const transaccion: WalletTransaction = {
      transactionId: randomUUID(),
      status: 'POSTED',
      type: 'DEBIT',
      concept: datos.concept,
      amount: monto.toFixed(2),
      currency: 'ARS',
      balanceAfter: nuevoSaldo.toFixed(2),
      externalReference: datos.externalReference,
      originalTransactionId: null,
      createdAt: new Date().toISOString(),
    };

    this.transaccionesPorId.set(transaccion.transactionId, transaccion);
    this.propietarioPorTransaccion.set(transaccion.transactionId, userId);
    this.transaccionesPorReferencia.set(claveReferencia, transaccion);
    this.idempotencia.set(idempotencyKey, { fingerprint, transaccion });

    return transaccion;
  }

  @Post('internal/v1/wallet-transactions/:transactionId/reversals')
  @HttpCode(201)
  revertir(
    @Param('transactionId') transactionId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Body() body?: unknown,
  ): WalletTransaction {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        detail: 'El header Idempotency-Key es obligatorio.',
      });
    }

    const parsed = walletReversalRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'HTTP_400',
        detail: 'Payload de reversa inválido.',
      });
    }

    const original = this.transaccionesPorId.get(transactionId);
    const userId = this.propietarioPorTransaccion.get(transactionId);
    if (!original || !userId) {
      throw new NotFoundException({
        code: 'WALLET_TRANSACTION_NOT_FOUND',
        detail: 'La transacción a revertir no existe.',
      });
    }

    const fingerprint = JSON.stringify({ transactionId, ...parsed.data });
    const previoIdempotente = this.idempotencia.get(idempotencyKey);
    if (previoIdempotente) {
      if (previoIdempotente.fingerprint !== fingerprint) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          detail: 'La clave de idempotencia ya fue usada con otro payload.',
        });
      }
      return previoIdempotente.transaccion;
    }

    const reversaExistente = this.reversasPorTransaccion.get(transactionId);
    if (reversaExistente) {
      throw new ConflictException({
        code: 'ALREADY_REVERSED',
        detail: 'La transacción ya fue revertida.',
        meta: { transactionId: reversaExistente.transactionId },
      });
    }

    const montoReversa = parsed.data.amount
      ? Number.parseFloat(parsed.data.amount)
      : Number.parseFloat(original.amount);
    const saldoActual = this.obtenerSaldoNumerico(userId);
    const nuevoSaldo = saldoActual + montoReversa;
    this.saldos.set(userId, nuevoSaldo);

    original.status = 'REVERSED';

    const reversa: WalletTransaction = {
      transactionId: randomUUID(),
      status: 'POSTED',
      type: 'REVERSAL',
      concept: 'REFUND',
      amount: montoReversa.toFixed(2),
      currency: 'ARS',
      balanceAfter: nuevoSaldo.toFixed(2),
      externalReference:
        parsed.data.externalReference ?? original.externalReference,
      originalTransactionId: original.transactionId,
      createdAt: new Date().toISOString(),
    };

    this.reversasPorTransaccion.set(transactionId, reversa);
    this.idempotencia.set(idempotencyKey, {
      fingerprint,
      transaccion: reversa,
    });

    return reversa;
  }

  @Get('internal/v1/wallet-transactions/by-reference')
  conciliarPorReferencia(
    @Query('sourceModule') sourceModule = 'events',
    @Query('externalReference') externalReference = '',
  ): WalletTransaction {
    const clave = `${sourceModule}:${externalReference}`;
    const encontrada = this.transaccionesPorReferencia.get(clave);
    if (!encontrada) {
      throw new NotFoundException({
        code: 'WALLET_TRANSACTION_NOT_FOUND',
        detail: 'No se encontró transacción para esa referencia.',
      });
    }
    return encontrada;
  }

  @Post('internal/v1/events')
  @HttpCode(202)
  recibirEvento(@Body() body: unknown): CoreEventAck {
    const parsed = coreEventEnvelopeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_ENVELOPE',
        detail: 'El sobre del evento no respeta el contrato de CORE v1.',
      });
    }

    this.eventosRecibidos.push(parsed.data);
    return {
      eventId: parsed.data.eventId,
      status: 'ACCEPTED',
    };
  }

  @Post('internal/v1/notifications')
  @HttpCode(201)
  recibirNotificacion(@Body() body: unknown): CoreNotification {
    const parsed = coreNotificationRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_NOTIFICATION_PAYLOAD',
        detail: 'El payload de notificación no es válido.',
      });
    }

    this.notificacionesRecibidas.push(parsed.data);
    return {
      id: randomUUID(),
      userId: parsed.data.userId,
      type: parsed.data.type,
      title: parsed.data.title,
      message: parsed.data.message,
      actionUrl: parsed.data.actionUrl ?? null,
      sourceModule: parsed.data.sourceModule,
      sourceReference: parsed.data.sourceReference,
      readAt: null,
      expiresAt: parsed.data.expiresAt ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  private obtenerSaldoNumerico(userId: string): number {
    if (!this.saldos.has(userId)) {
      this.saldos.set(userId, SALDO_INICIAL_PESOS);
    }
    return this.saldos.get(userId)!;
  }

  private obtenerWalletId(userId: string): string {
    if (!this.walletIds.has(userId)) {
      this.walletIds.set(userId, randomUUID());
    }
    return this.walletIds.get(userId)!;
  }

  private obtenerBalance(userId: string): WalletBalance {
    const saldo = this.obtenerSaldoNumerico(userId);
    return {
      walletId: this.obtenerWalletId(userId),
      userId,
      balance: saldo.toFixed(2),
      currency: 'ARS',
      updatedAt: new Date().toISOString(),
    };
  }

  private extraerSubDeAuth(authHeader?: string): string | null {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const partes = token.split('.');
    if (partes.length !== 3 || !partes[1]) {
      return null;
    }
    try {
      const payload = JSON.parse(
        Buffer.from(partes[1], 'base64url').toString('utf8'),
      ) as { sub?: string };
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}

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
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  coreEventEnvelopeSchema,
  coreNotificationRequestSchema,
  serviceTokenRequestSchema,
  walletDebitRequestSchema,
  walletReversalRequestSchema,
  type CoreEventAck,
  type CoreEventEnvelope,
  type CoreNotificationAck,
  type CoreNotificationRequest,
  type JwksResponse,
  type ServiceTokenResponse,
  type WalletBalance,
  type WalletTransaction,
} from '@repo/contracts';
import { USUARIO_DEMO_ID } from '../usuario-demo';
import { firmarJwtCore, obtenerJwkPublicaDemo } from './core-crypto';

const SALDO_INICIAL_PESOS = 10_000;

/**
 * CORE simulado sobre los contratos oficiales de G10 (IAM/JWKS, Wallets,
 * Event Bus y Notificaciones). Solo se monta cuando `CORE_BASE_URL` no está
 * definido; con `CORE_BASE_URL` configurado los servicios consumen el CORE real.
 */
@ApiExcludeController()
@Controller({ path: 'core', version: '1' })
export class CoreMockController {
  private readonly saldos = new Map<string, number>();
  private readonly transaccionesPorId = new Map<string, WalletTransaction>();
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
          'wallet:debit:any',
          'wallet:read:any',
          'events:publish',
          'notifications:send',
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
      userId,
      type: 'DEBIT',
      status: 'POSTED',
      amount: monto.toFixed(2),
      currency: 'ARS',
      balanceAfter: nuevoSaldo.toFixed(2),
      concept: datos.concept,
      sourceModule: datos.sourceModule,
      externalReference: datos.externalReference,
      createdAt: new Date().toISOString(),
    };

    this.transaccionesPorId.set(transaccion.transactionId, transaccion);
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
    if (!original) {
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
    const saldoActual = this.obtenerSaldoNumerico(original.userId);
    const nuevoSaldo = saldoActual + montoReversa;
    this.saldos.set(original.userId, nuevoSaldo);

    original.status = 'REVERSED';

    const reversa: WalletTransaction = {
      transactionId: randomUUID(),
      userId: original.userId,
      type: 'REVERSAL',
      status: 'POSTED',
      amount: montoReversa.toFixed(2),
      currency: 'ARS',
      balanceAfter: nuevoSaldo.toFixed(2),
      concept: parsed.data.reason,
      sourceModule: original.sourceModule,
      externalReference: original.externalReference,
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
  @HttpCode(202)
  recibirNotificacion(@Body() body: unknown): CoreNotificationAck {
    const parsed = coreNotificationRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_NOTIFICATION_PAYLOAD',
        detail: 'El payload de notificación no es válido.',
      });
    }

    this.notificacionesRecibidas.push(parsed.data);
    return {
      notificationId: randomUUID(),
      status: 'QUEUED',
    };
  }

  private obtenerSaldoNumerico(userId: string): number {
    if (!this.saldos.has(userId)) {
      this.saldos.set(userId, SALDO_INICIAL_PESOS);
    }
    return this.saldos.get(userId)!;
  }

  private obtenerBalance(userId: string): WalletBalance {
    const saldo = this.obtenerSaldoNumerico(userId);
    return {
      userId,
      balance: saldo.toFixed(2),
      currency: 'ARS',
      status: 'ACTIVE',
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

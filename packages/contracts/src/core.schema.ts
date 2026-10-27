import { z } from "zod";

const fecha = z.iso.datetime({ offset: true });

export const rolUsuarioDominioSchema = z.enum([
  "estudiante",
  "docente",
  "administrativo",
]);

export type RolUsuarioDominio = z.infer<typeof rolUsuarioDominioSchema>;

/**
 * Claims del JWT emitido por CORE (RS256) consumidos por `CoreJwtGuard`.
 * Soporta tanto el formato RBAC multi-rol (`roles`, `permissions`, `careerIds`)
 * como los claims de nombre/rol directo.
 */
export const coreJwtClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
  nombre: z.string().optional(),
  roles: z.array(z.string()).default([]),
  rol: rolUsuarioDominioSchema.optional(),
  permissions: z.array(z.string()).default([]),
  careerIds: z.array(z.string()).default([]),
  sid: z.string().optional(),
  iss: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
  jti: z.string().optional(),
});

export type CoreJwtClaims = z.infer<typeof coreJwtClaimsSchema>;

/** `GET /.well-known/jwks.json` */
export const jwkSchema = z.object({
  kty: z.literal("RSA"),
  kid: z.string().min(1),
  use: z.string().optional(),
  alg: z.string().optional(),
  n: z.string().min(1),
  e: z.string().min(1),
});

export type Jwk = z.infer<typeof jwkSchema>;

export const jwksResponseSchema = z.object({
  keys: z.array(jwkSchema),
});

export type JwksResponse = z.infer<typeof jwksResponseSchema>;

/** `POST /internal/v1/service-auth/token` */
export const serviceTokenRequestSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

export type ServiceTokenRequest = z.infer<typeof serviceTokenRequestSchema>;

export const serviceTokenResponseSchema = z.object({
  accessToken: z.string().min(1).optional(),
  access_token: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
  tokenType: z.string().optional(),
  token_type: z.string().optional(),
  expiresIn: z.number().positive().optional(),
  expires_in: z.number().positive().optional(),
});

export type ServiceTokenResponse = z.infer<typeof serviceTokenResponseSchema>;

/** `GET /api/v1/wallets/me` y `GET /internal/v1/wallets/{userId}` */
export const walletBalanceSchema = z.object({
  userId: z.string().min(1),
  balance: z.string(),
  currency: z.literal("ARS"),
  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).default("ACTIVE"),
});

export type WalletBalance = z.infer<typeof walletBalanceSchema>;

/** `POST /internal/v1/wallets/{userId}/debits` */
export const walletDebitRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.literal("ARS"),
  concept: z.string().min(1),
  sourceModule: z.literal("events"),
  externalReference: z.string().min(1),
});

export type WalletDebitRequest = z.infer<typeof walletDebitRequestSchema>;

/** `POST /internal/v1/wallet-transactions/{transactionId}/reversals` */
export const walletReversalRequestSchema = z.object({
  reason: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

export type WalletReversalRequest = z.infer<typeof walletReversalRequestSchema>;

/** Respuesta de movimientos de billetera en CORE (`201` en débito/reversa, `200` en conciliación). */
export const walletTransactionSchema = z.object({
  transactionId: z.guid(),
  userId: z.string().min(1),
  type: z.enum(["DEBIT", "CREDIT", "REVERSAL"]),
  status: z.enum(["POSTED", "REVERSED"]),
  amount: z.string(),
  currency: z.literal("ARS"),
  balanceAfter: z.string(),
  concept: z.string(),
  sourceModule: z.string(),
  externalReference: z.string(),
  createdAt: fecha,
});

export type WalletTransaction = z.infer<typeof walletTransactionSchema>;

/** Sobre estándar de eventos del bus de CORE (`POST /internal/v1/events`). */
export const coreEventEnvelopeSchema = z.object({
  specVersion: z.literal("1.0"),
  eventId: z.guid(),
  eventType: z.string().min(1),
  source: z.string().min(1),
  occurredAt: fecha,
  subject: z.string().min(1),
  correlationId: z.guid(),
  causationId: z.string().nullable(),
  actor: z.object({
    type: z.enum(["SERVICE", "USER"]),
    id: z.string().min(1),
  }),
  data: z.record(z.string(), z.unknown()),
});

export type CoreEventEnvelope = z.infer<typeof coreEventEnvelopeSchema>;

export const coreEventAckSchema = z.object({
  eventId: z.guid(),
  status: z.literal("ACCEPTED"),
});

export type CoreEventAck = z.infer<typeof coreEventAckSchema>;

/** Payload de recordatorio de evento (HU7 — `evento.recordatorio`). */
export const recordatorioEventoSchema = z.object({
  tipo: z.literal("evento.recordatorio"),
  usuarioId: z.string().min(1),
  eventoId: z.uuid(),
  titulo: z.string().min(1),
  fechaInicio: fecha,
  locacion: z.string().min(1),
  url: z.url(),
});

export type RecordatorioEvento = z.infer<typeof recordatorioEventoSchema>;

/** `POST /internal/v1/notifications` */
export const coreNotificationRequestSchema = z.object({
  userId: z.string().min(1),
  type: z.literal("evento.recordatorio"),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.url(),
  metadata: recordatorioEventoSchema,
});

export type CoreNotificationRequest = z.infer<
  typeof coreNotificationRequestSchema
>;

export const coreNotificationAckSchema = z.object({
  notificationId: z.guid(),
  status: z.literal("QUEUED"),
});

export type CoreNotificationAck = z.infer<typeof coreNotificationAckSchema>;

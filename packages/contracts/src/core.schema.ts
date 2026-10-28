import { z } from "zod";

const fecha = z.iso.datetime({ offset: true });

export const rolUsuarioDominioSchema = z.enum([
  "estudiante",
  "docente",
  "administrativo",
]);

export type RolUsuarioDominio = z.infer<typeof rolUsuarioDominioSchema>;

export const coreUserStatusSchema = z.enum([
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
]);

export type CoreUserStatus = z.infer<typeof coreUserStatusSchema>;

/** Identidad devuelta por CORE en `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` y `GET /api/v1/auth/me`. */
export const coreAuthUserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  careerIds: z.array(z.string()),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  status: coreUserStatusSchema,
});

export type CoreAuthUser = z.infer<typeof coreAuthUserSchema>;

/** `POST /api/v1/auth/login` */
export const coreLoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type CoreLoginRequest = z.infer<typeof coreLoginRequestSchema>;

/** Respuesta `200` de `POST /api/v1/auth/login` y `POST /api/v1/auth/refresh`. */
export const coreLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  user: coreAuthUserSchema,
});

export type CoreLoginResponse = z.infer<typeof coreLoginResponseSchema>;

/** `POST /internal/v1/auth/introspect` */
export const coreIntrospectRequestSchema = z.object({
  token: z.string().min(1),
});

export type CoreIntrospectRequest = z.infer<typeof coreIntrospectRequestSchema>;

export const coreIntrospectResponseSchema = z.object({
  active: z.boolean(),
  sub: z.string().optional(),
  service: z.string().optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  kind: z.enum(["user", "service"]).optional(),
  careerIds: z.array(z.string()).optional(),
  exp: z.number().optional(),
});

export type CoreIntrospectResponse = z.infer<
  typeof coreIntrospectResponseSchema
>;

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
  walletId: z.guid(),
  userId: z.string().min(1),
  balance: z.string(),
  currency: z.literal("ARS"),
  updatedAt: fecha,
});

export type WalletBalance = z.infer<typeof walletBalanceSchema>;

export const walletConceptSchema = z.enum([
  "TOP_UP",
  "PAYROLL",
  "SCHOLARSHIP",
  "ADJUSTMENT",
  "LIBRARY_FINE",
  "DINING_RESERVATION",
  "STORE_PURCHASE",
  "EVENT_REGISTRATION",
  "REFUND",
]);

export type WalletConcept = z.infer<typeof walletConceptSchema>;

/** `POST /internal/v1/wallets/{userId}/debits` */
export const walletDebitRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.literal("ARS"),
  concept: walletConceptSchema,
  sourceModule: z.string().min(1),
  externalReference: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type WalletDebitRequest = z.infer<typeof walletDebitRequestSchema>;

/** `POST /internal/v1/wallet-transactions/{id}/reversals` */
export const walletReversalRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  reason: z.string().optional(),
  externalReference: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type WalletReversalRequest = z.infer<typeof walletReversalRequestSchema>;

/** Respuesta de movimientos de billetera en CORE (`201` en débito/reversa, `200` en conciliación). */
export const walletTransactionSchema = z.object({
  transactionId: z.guid(),
  status: z.enum(["PENDING", "POSTED", "REJECTED", "REVERSED"]),
  type: z.enum(["CREDIT", "DEBIT", "REVERSAL"]),
  concept: walletConceptSchema,
  amount: z.string(),
  currency: z.literal("ARS"),
  balanceAfter: z.string().nullable(),
  externalReference: z.string(),
  originalTransactionId: z.guid().nullable(),
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
  causationId: z.string().nullable().optional(),
  actor: z.object({
    type: z.enum(["user", "service", "system"]),
    id: z.string().min(1),
  }),
  data: z.record(z.string(), z.unknown()),
});

export type CoreEventEnvelope = z.infer<typeof coreEventEnvelopeSchema>;

export const coreEventAckSchema = z.object({
  eventId: z.guid(),
  status: z.enum(["ACCEPTED", "PUBLISHED", "FAILED"]),
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
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  actionUrl: z.string().optional(),
  sourceModule: z.string().min(1),
  sourceReference: z.string().min(1),
  expiresAt: fecha.optional(),
});

export type CoreNotificationRequest = z.infer<
  typeof coreNotificationRequestSchema
>;

export const coreNotificationSchema = z.object({
  id: z.guid(),
  userId: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  actionUrl: z.string().nullable(),
  sourceModule: z.string().min(1),
  sourceReference: z.string().min(1),
  readAt: fecha.nullable(),
  expiresAt: fecha.nullable(),
  createdAt: fecha,
});

export type CoreNotification = z.infer<typeof coreNotificationSchema>;

export const coreNotificationAckSchema = coreNotificationSchema;
export type CoreNotificationAck = CoreNotification;

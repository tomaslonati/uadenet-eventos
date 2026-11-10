CREATE TYPE "public"."estado_evento" AS ENUM('publicado', 'cancelado');--> statement-breakpoint
ALTER TYPE "public"."estado_inscripcion" ADD VALUE 'cancelada';--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "estado" "estado_evento" DEFAULT 'publicado' NOT NULL;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "motivo_cancelacion" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "cancelado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "reprogramado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inscripciones" ADD COLUMN "reembolsado_en" timestamp with time zone;
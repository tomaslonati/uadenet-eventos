CREATE TYPE "public"."categoria_precio" AS ENUM('general', 'especial');--> statement-breakpoint
ALTER TABLE "locaciones" ADD COLUMN "apto_eventos" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "categoria_precio" "categoria_precio";--> statement-breakpoint
ALTER TABLE "inscripciones" ADD COLUMN "monto_cobrado" integer;--> statement-breakpoint
ALTER TABLE "eventos" DROP COLUMN "precio";
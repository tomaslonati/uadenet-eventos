CREATE TYPE "public"."estado_inscripcion" AS ENUM('inscripto');--> statement-breakpoint
CREATE TYPE "public"."metodo_asistencia" AS ENUM('qr', 'codigo-en-sala', 'manual');--> statement-breakpoint
CREATE TABLE "inscripciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"fecha_inscripcion" timestamp with time zone DEFAULT now() NOT NULL,
	"estado" "estado_inscripcion" DEFAULT 'inscripto' NOT NULL,
	"pago_confirmado" boolean NOT NULL,
	CONSTRAINT "inscripciones_evento_id_usuario_id_unique" UNIQUE("evento_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "asistencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscripcion_id" uuid NOT NULL,
	"confirmada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"metodo" "metodo_asistencia" NOT NULL,
	CONSTRAINT "asistencias_inscripcion_id_unique" UNIQUE("inscripcion_id")
);
--> statement-breakpoint
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_inscripcion_id_inscripciones_id_fk" FOREIGN KEY ("inscripcion_id") REFERENCES "public"."inscripciones"("id") ON DELETE no action ON UPDATE no action;
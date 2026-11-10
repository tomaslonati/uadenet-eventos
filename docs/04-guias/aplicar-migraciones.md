# Aplicar migraciones al Supabase compartido

> Runbook. Hay un solo proyecto Supabase para dev y prod (ADR 0011) y no tiene branching: **avisar al grupo antes de aplicar cualquier migration**, porque la misma base la usan dev y prod.

## Cuándo usar este camino

`drizzle-kit migrate` necesita la conexión directa o el pooler de sesión (`5432`); el pooler de transacciones (`6543`) lo deja colgado (ver el README raíz). Cuando solo se tiene la cadena del pooler de transacciones, se aplica el SQL a mano desde el editor SQL de Supabase **y se registra en la tabla de Drizzle**, para que una migración posterior no intente repetirla.

## Pasos

1. Avisar en el grupo qué migration se va a aplicar y cuándo.
2. En el editor SQL de Supabase, pegar el contenido de `packages/db/src/migrations/<nombre>.sql` y ejecutarlo. **Va antes de desplegar la API nueva**: las migrations son aditivas (columnas nuevas con default, valores nuevos de enum), así que la API vieja sigue funcionando con el schema nuevo, pero la API nueva falla en cada consulta si el schema todavía no lo tiene. Como Vercel despliega al hacer merge, la migration se aplica antes del merge.
3. Registrar la migration. El hash es el `sha256` del archivo y `created_at` es el `when` de su entrada en `packages/db/src/migrations/meta/_journal.json`:

   ```bash
   shasum -a 256 packages/db/src/migrations/<nombre>.sql
   ```

   ```sql
   INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
   VALUES ('<sha256 del archivo>', <when del journal>);
   ```

4. Desplegar la API (merge a `dev`, o `dev → main` para prod) y verificar con `GET /api/v1/eventos`.

## Migration pendiente de aplicar

| Migration | Qué hace | Hash (`sha256`) | `created_at` |
|---|---|---|---|
| `0003_gestion_de_eventos` | `eventos.estado` / `motivo_cancelacion` / `cancelado_en` / `reprogramado_en`; `inscripciones.estado` suma `cancelada` y `reembolsado_en` (ADR 0015) | `ebdac7c9f1c42e2e8a8b6acce48bfd01cbdb1e1a09c1e8e56a35c743e6e210c0` | `1794332625408` |

El hash y el `created_at` valen mientras el archivo `.sql` no se modifique; si se regenera la migration, recalcular. Una vez aplicada y registrada, borrar esta fila (el historial queda en el journal).

La migration `0003` incluye `ALTER TYPE ... ADD VALUE`. Postgres lo permite dentro de una transacción mientras el valor nuevo no se use en esa misma transacción, y la migration no lo usa. Si el editor SQL se queja, ejecutar las sentencias de a una (están separadas por `--> statement-breakpoint`).

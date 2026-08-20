// Los tests unitarios mockean @repo/db — nunca pegan contra una base real —
// pero @repo/env valida DATABASE_URL al importarse, así que necesita un valor
// sintácticamente válido presente antes de que corra cualquier spec.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

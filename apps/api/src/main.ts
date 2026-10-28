import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TarifasService } from './common/backoffice/tarifas.service';
import { LocacionesSyncService } from './modules/locaciones/locaciones-sync.service';
import { RecordatoriosService } from './workers/recordatorios.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('uadenet-eventos API')
    .setDescription('API del módulo Eventos Académicos de UADEnet')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const esVercel = process.env.VERCEL === '1';
  SwaggerModule.setup(
    'api/docs',
    app,
    swaggerDocument,
    esVercel
      ? {
          customCssUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.min.css',
          customJs: [
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-standalone-preset.min.js',
          ],
        }
      : undefined,
  );

  if (esVercel) {
    await app.get(TarifasService).asegurarCargado();
  }

  await app.listen(process.env.PORT ?? 3000);

  if (!esVercel) {
    // Después del listen: con Backoffice/CORE simulados en proceso local, el primer pedido apunta a esta misma API.
    app.get(TarifasService).iniciarPolling();
    app.get(LocacionesSyncService).iniciarSincronizacion();
    app.get(RecordatoriosService).iniciarWorker();
  }
}
void bootstrap();

import { Module } from '@nestjs/common';
import { BackofficeMockController } from './backoffice-mock.controller';

@Module({ controllers: [BackofficeMockController] })
export class BackofficeMockModule {}

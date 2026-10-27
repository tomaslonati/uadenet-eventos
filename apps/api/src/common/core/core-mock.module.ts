import { Module } from '@nestjs/common';
import { CoreMockController } from './core-mock.controller';

@Module({
  controllers: [CoreMockController],
})
export class CoreMockModule {}

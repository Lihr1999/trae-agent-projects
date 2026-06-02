import { Module } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';

@Module({
  providers: [ScenesService],
  controllers: [ScenesController],
  exports: [ScenesService],
})
export class ScenesModule {}

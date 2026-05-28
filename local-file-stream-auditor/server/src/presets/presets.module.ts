import { Module } from '@nestjs/common';
import { PresetsService } from './presets.service';

@Module({
  providers: [PresetsService],
  exports: [PresetsService],
})
export class PresetsModule {}

import { Controller, Get, Param } from '@nestjs/common';
import { PresetsService } from './presets.service';

@Controller('presets')
export class PresetsController {
  constructor(private readonly presetsService: PresetsService) {}

  @Get()
  getAllPresets() {
    return this.presetsService.getAllPresets();
  }

  @Get(':id/operations')
  getPresetOperations(@Param('id') id: string) {
    const operations = this.presetsService.getPresetOperations(id);
    if (!operations) {
      return { error: 'Preset not found' };
    }
    return { operations };
  }
}

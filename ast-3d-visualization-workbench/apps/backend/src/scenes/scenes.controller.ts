import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ScenesService } from './scenes.service';

@Controller('scenes')
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Get()
  getAllScenes() {
    return this.scenesService.getAllScenes();
  }

  @Get(':id')
  getSceneById(@Param('id', ParseIntPipe) id: number) {
    const scene = this.scenesService.getSceneById(id);
    if (!scene) {
      return { error: 'Scene not found', statusCode: 404 };
    }
    return scene;
  }
}

import { Controller, Post, Body } from '@nestjs/common';
import { DiffService } from './diff.service';
import { DiffRequest } from './diff.interfaces';

@Controller('diff')
export class DiffController {
  constructor(private readonly diffService: DiffService) {}

  @Post('compute')
  computeDiff(@Body() body: DiffRequest) {
    const { astA, astB } = body;
    return this.diffService.computeDiff(astA, astB);
  }
}

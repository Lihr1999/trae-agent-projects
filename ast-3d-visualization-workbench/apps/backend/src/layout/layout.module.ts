import { Module } from '@nestjs/common';
import { LayoutService } from './layout.service';
import { LayoutController } from './layout.controller';

@Module({
  providers: [LayoutService],
  controllers: [LayoutController],
  exports: [LayoutService],
})
export class LayoutModule {}

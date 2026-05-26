import { Module } from '@nestjs/common';
import { CrdtService } from './crdt.service';

@Module({
  providers: [CrdtService],
  exports: [CrdtService],
})
export class CrdtModule {}

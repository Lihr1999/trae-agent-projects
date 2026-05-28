import { Module } from '@nestjs/common';
import { RulesService } from './rules.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}

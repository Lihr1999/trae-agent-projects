import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { DatabaseModule } from '../database/database.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [DatabaseModule, RulesModule],
  providers: [ParserService],
  exports: [ParserService],
})
export class ParserModule {}

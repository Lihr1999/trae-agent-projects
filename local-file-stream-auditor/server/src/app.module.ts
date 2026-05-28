import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { ParserModule } from './parser/parser.module';
import { RulesModule } from './rules/rules.module';
import { PresetsModule } from './presets/presets.module';

@Module({
  imports: [DatabaseModule, ParserModule, RulesModule, PresetsModule],
  controllers: [AppController],
})
export class AppModule {}

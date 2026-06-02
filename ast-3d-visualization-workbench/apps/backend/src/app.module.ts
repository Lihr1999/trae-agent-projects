import { Module } from '@nestjs/common';
import { ParserModule } from './parser/parser.module';
import { LayoutModule } from './layout/layout.module';
import { DiffModule } from './diff/diff.module';
import { DatabaseModule } from './database/database.module';
import { ScenesModule } from './scenes/scenes.module';

@Module({
  imports: [
    DatabaseModule,
    ParserModule,
    LayoutModule,
    DiffModule,
    ScenesModule,
  ],
})
export class AppModule {}

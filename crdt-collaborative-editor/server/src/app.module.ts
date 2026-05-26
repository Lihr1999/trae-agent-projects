import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { CrdtModule } from './crdt/crdt.module';
import { GatewayModule } from './gateway/gateway.module';
import { PresetsModule } from './presets/presets.module';
import { AppController } from './app.controller';

@Module({
  imports: [DatabaseModule, CrdtModule, GatewayModule, PresetsModule],
  controllers: [AppController],
})
export class AppModule {}

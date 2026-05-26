import { Module } from '@nestjs/common';
import { EditorGateway } from './editor.gateway';
import { CrdtModule } from '../crdt/crdt.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [CrdtModule, DatabaseModule],
  providers: [EditorGateway],
})
export class GatewayModule {}

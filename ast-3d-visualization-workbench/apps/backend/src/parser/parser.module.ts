import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { ParserController } from './parser.controller';
import { ParserGateway } from './parser.gateway';

@Module({
  providers: [ParserService, ParserGateway],
  controllers: [ParserController],
  exports: [ParserService],
})
export class ParserModule {}

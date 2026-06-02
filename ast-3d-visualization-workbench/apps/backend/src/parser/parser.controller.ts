import { Controller, Post, Body } from '@nestjs/common';
import { ParserService } from './parser.service';
import { IncrementalParseRequest } from './parser.interfaces';

@Controller('parser')
export class ParserController {
  constructor(private readonly parserService: ParserService) {}

  @Post('parse')
  async parse(@Body() body: { source: string; language: string }) {
    const { source, language } = body;
    return this.parserService.parse(source, language || 'javascript');
  }

  @Post('parse-incremental')
  async parseIncremental(@Body() body: IncrementalParseRequest) {
    return this.parserService.parseIncremental(body);
  }
}

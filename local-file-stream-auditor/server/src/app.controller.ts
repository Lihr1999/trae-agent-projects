import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as os from 'os';
import { Observable, Subject } from 'rxjs';
import { ParserService } from './parser/parser.service';
import { RulesService, FieldRule } from './rules/rules.service';
import { PresetsService, PresetType } from './presets/presets.service';

@Controller('api')
export class AppController {
  private parseStreams = new Map<
    string,
    Subject<MessageEvent>
  >();

  constructor(
    private parserService: ParserService,
    private rulesService: RulesService,
    private presetsService: PresetsService
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tempDir = path.join(os.tmpdir(), 'auditor-uploads');
          const fs = require('fs');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
    })
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('rules') rulesStr: string,
    @Body('format') format: 'csv' | 'jsonl' = 'csv'
  ) {
    const rules: FieldRule[] = rulesStr ? JSON.parse(rulesStr) : [
      { field: 'id', type: 'number', required: true, unique: true },
      { field: 'name', type: 'string', required: true },
      { field: 'email', type: 'string', required: false, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      { field: 'age', type: 'number', required: false, min: 0, max: 150 },
      { field: 'department', type: 'string', required: false },
    ];

    const streamId = `parse-${Date.now()}`;
    const subject = new Subject<MessageEvent>();
    this.parseStreams.set(streamId, subject);

    process.nextTick(async () => {
      try {
        await this.parserService.parseFile(
          file.path,
          file.originalname,
          format,
          rules,
          (chunk) => {
            subject.next({
              type: 'chunk',
              data: JSON.stringify(chunk),
            });
          }
        );
        subject.next({
          type: 'complete',
          data: JSON.stringify({ status: 'completed' }),
        });
        subject.complete();
      } catch (error) {
        subject.next({
          type: 'error',
          data: JSON.stringify({ error: error.message }),
        });
        subject.error(error);
      } finally {
        this.parseStreams.delete(streamId);
      }
    });

    return { streamId };
  }

  @Sse('parse-stream/:streamId')
  parseStream(@Param('streamId') streamId: string): Observable<MessageEvent> {
    const subject = this.parseStreams.get(streamId);
    if (!subject) {
      const errorSubject = new Subject<MessageEvent>();
      errorSubject.next({
        type: 'error',
        data: JSON.stringify({ error: 'Stream not found' }),
      });
      errorSubject.complete();
      return errorSubject.asObservable();
    }
    return subject.asObservable();
  }

  @Post('preset/:type')
  async loadPreset(
    @Param('type') type: PresetType,
    @Body('rules') rulesStr: string
  ) {
    const rules: FieldRule[] = rulesStr ? JSON.parse(rulesStr) : [
      { field: 'id', type: 'number', required: true, unique: true },
      { field: 'name', type: 'string', required: true },
      { field: 'email', type: 'string', required: false, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      { field: 'age', type: 'number', required: false, min: 0, max: 150 },
      { field: 'department', type: 'string', required: false },
      { field: 'notes', type: 'string', required: false },
    ];

    const presetFile = await this.presetsService.generatePresetFile(type);

    const streamId = `parse-${Date.now()}`;
    const subject = new Subject<MessageEvent>();
    this.parseStreams.set(streamId, subject);

    process.nextTick(async () => {
      try {
        await this.parserService.parseFile(
          presetFile.filePath,
          presetFile.originalName,
          presetFile.format,
          rules,
          (chunk) => {
            subject.next({
              type: 'chunk',
              data: JSON.stringify(chunk),
            });
          }
        );
        subject.next({
          type: 'complete',
          data: JSON.stringify({ status: 'completed' }),
        });
        subject.complete();
      } catch (error) {
        subject.next({
          type: 'error',
          data: JSON.stringify({ error: error.message }),
        });
        subject.error(error);
      } finally {
        this.parseStreams.delete(streamId);
      }
    });

    return { streamId, presetInfo: presetFile };
  }

  @Get('presets')
  getPresets() {
    return this.presetsService.getPresets();
  }

  @Get('files')
  getFiles() {
    return this.parserService.getFileHistory();
  }

  @Get('files/:id')
  getFile(@Param('id') id: number) {
    return this.parserService.getFileById(id);
  }

  @Get('files/:id/field-stats')
  getFieldStats(@Param('id') id: number) {
    return this.parserService.getFieldStats(id);
  }

  @Get('files/:id/anomalies')
  getAnomalies(
    @Param('id') id: number,
    @Query('type') type?: string
  ) {
    return this.parserService.getAnomalies(id, type);
  }

  @Get('files/:id/chunks')
  getChunks(@Param('id') id: number) {
    return this.parserService.getChunks(id);
  }

  @Post('files/:id/report')
  generateReport(@Param('id') id: number) {
    return this.parserService.generateReport(id);
  }

  @Get('files/:id/report')
  getReport(@Param('id') id: number) {
    return this.parserService.getReport(id);
  }

  @Get('rules')
  getRules() {
    return this.rulesService.getRuleTemplates();
  }

  @Post('rules')
  saveRules(
    @Body('name') name: string,
    @Body('rules') rules: FieldRule[]
  ) {
    return this.rulesService.saveRuleTemplate(name, rules);
  }
}

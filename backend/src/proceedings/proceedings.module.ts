import { Module } from '@nestjs/common';
import { ProceedingsService } from './proceedings.service';
import { ProceedingsController } from './proceedings.controller';
import { ProceedingsPdfParserService } from './proceedings-pdf-parser.service';

@Module({
  providers: [ProceedingsService, ProceedingsPdfParserService],
  controllers: [ProceedingsController],
  exports: [ProceedingsService, ProceedingsPdfParserService],
})
export class ProceedingsModule {}

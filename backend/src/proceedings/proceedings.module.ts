import { Module } from '@nestjs/common';
import { ProceedingsService } from './proceedings.service';
import { ProceedingsController } from './proceedings.controller';

@Module({
  providers: [ProceedingsService],
  controllers: [ProceedingsController],
  exports: [ProceedingsService],
})
export class ProceedingsModule {}

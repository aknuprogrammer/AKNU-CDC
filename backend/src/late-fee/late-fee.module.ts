import { Module } from '@nestjs/common';
import { LateFeeService } from './late-fee.service';
import { LateFeeController } from './late-fee.controller';

@Module({
  providers: [LateFeeService],
  controllers: [LateFeeController],
  exports: [LateFeeService],
})
export class LateFeeModule {}

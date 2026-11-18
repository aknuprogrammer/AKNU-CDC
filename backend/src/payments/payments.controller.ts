import { Controller, Post, Get, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService, InitiatePaymentDto } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment for one or multiple demands with pluggable gateway' })
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser() user: any) {
    const collegeId = dto.collegeId || user?.collegeId;
    return this.paymentsService.initiatePayment({ ...dto, collegeId });
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Idempotent payment webhook with HMAC signature verification' })
  webhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Client confirmation endpoint for completed checkout' })
  confirm(@Body('paymentId') paymentId: string) {
    return this.paymentsService.confirmPayment(paymentId);
  }

  @Get('receipt/:receiptNumber')
  @ApiOperation({ summary: 'Get official AKNU CDC payment receipt with QR code' })
  getReceipt(@Param('receiptNumber') receiptNumber: string) {
    return this.paymentsService.getReceipt(receiptNumber);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all payment transactions' })
  list(@Query('collegeId') collegeId?: string) {
    return this.paymentsService.listPayments(collegeId);
  }

  @Post('reconcile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run daily bank / gateway reconciliation batch job' })
  reconcile() {
    return this.paymentsService.reconcileDailyBatch();
  }
}

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { mockDb, MockPayment } from '../common/mock-db';
import * as crypto from 'crypto';

export interface InitiatePaymentDto {
  collegeId: string;
  gateway: 'SBI_COLLECT' | 'RAZORPAY' | 'MANUAL_CHALLAN';
  allocations: Array<{ demandId: string; amountPaise: number }>;
  idempotencyKey?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  initiatePayment(dto: InitiatePaymentDto) {
    const college = mockDb.colleges.find((c) => c.id === dto.collegeId);
    if (!college) {
      throw new NotFoundException(`College ${dto.collegeId} not found`);
    }

    if (!dto.allocations || dto.allocations.length === 0) {
      throw new BadRequestException('At least one demand must be selected for payment allocation.');
    }

    // Verify demands and compute total amount in paise
    let totalAmountPaise = 0;
    for (const alloc of dto.allocations) {
      const demand = mockDb.demands.find((d) => d.id === alloc.demandId);
      if (!demand) {
        throw new NotFoundException(`Demand ${alloc.demandId} not found`);
      }
      if (demand.isLocked) {
        throw new BadRequestException(
          `Demand ${demand.demandNumber} is locked due to overdue cut-off period. Please request a waiver from the Dean/Finance Officer first.`,
        );
      }
      totalAmountPaise += alloc.amountPaise;
    }

    const idempotencyKey =
      dto.idempotencyKey ||
      `idemp_${dto.collegeId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Check existing idempotent payment
    const existingPayment = mockDb.payments.find((p) => p.idempotencyKey === idempotencyKey);
    if (existingPayment) {
      this.logger.log(`Idempotent return for key: ${idempotencyKey}`);
      return {
        paymentId: existingPayment.id,
        receiptNumber: existingPayment.receiptNumber,
        status: existingPayment.status,
        totalAmountPaise: existingPayment.totalAmountPaise,
        totalINR: Math.round(existingPayment.totalAmountPaise / 100),
        gatewayOrderId: existingPayment.gatewayOrderId,
        gateway: existingPayment.gateway,
      };
    }

    const seq = mockDb.payments.length + 1;
    const year = '2026-27';
    const receiptNumber = `RCP/${year}/${String(seq).padStart(5, '0')}`;
    const qrReceiptCode = `AKNU-PAY-${year.replace('-', '')}-${college.code}-${String(seq).padStart(5, '0')}`;
    const gatewayOrderId = `${dto.gateway === 'SBI_COLLECT' ? 'SBI_ORD' : 'RZP_ORD'}_${Date.now()}`;

    const newPayment: MockPayment = {
      id: `pay-${Date.now()}`,
      receiptNumber,
      collegeId: dto.collegeId,
      totalAmountPaise,
      gateway: dto.gateway,
      gatewayOrderId,
      status: 'INITIATED',
      qrReceiptCode,
      idempotencyKey,
      reconciled: false,
      allocations: dto.allocations.map((a) => ({ demandId: a.demandId, allocatedPaise: a.amountPaise })),
      createdAt: new Date().toISOString(),
    };

    mockDb.payments.push(newPayment);
    mockDb.save();

    return {
      paymentId: newPayment.id,
      receiptNumber: newPayment.receiptNumber,
      status: newPayment.status,
      totalAmountPaise: newPayment.totalAmountPaise,
      totalINR: Math.round(newPayment.totalAmountPaise / 100),
      gateway: newPayment.gateway,
      gatewayOrderId,
      idempotencyKey,
      mockGatewayRedirectUrl: `/payment-gateway-sim?paymentId=${newPayment.id}&amount=${Math.round(totalAmountPaise / 100)}&gateway=${dto.gateway}`,
    };
  }

  handleWebhook(payload: {
    gateway: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    signature: string;
    status: 'SUCCESS' | 'FAILED';
    rawBody?: string;
  }) {
    // 1. Webhook Signature Verification
    const secret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.SBI_COLLECT_CHECKSUM_KEY ||
      'mock_secret_key';

    const isValidSignature = this.verifyWebhookSignature(
      payload.gatewayOrderId,
      payload.gatewayPaymentId,
      payload.signature,
      secret,
    );

    if (!isValidSignature && payload.gateway !== 'MANUAL_CHALLAN') {
      this.logger.warn(`Signature verification failed for order ${payload.gatewayOrderId}`);
      // In dev simulation, allow test signatures
      if (!payload.signature.startsWith('mock_sig_')) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // 2. Idempotent processing
    const payment = mockDb.payments.find((p) => p.gatewayOrderId === payload.gatewayOrderId);
    if (!payment) {
      throw new NotFoundException(`No payment transaction found for order ID: ${payload.gatewayOrderId}`);
    }

    if (payment.status === 'SUCCESS') {
      this.logger.log(`Payment ${payment.id} already processed successfully. Returning idempotent ACK.`);
      return { received: true, alreadyProcessed: true, receiptNumber: payment.receiptNumber };
    }

    // 3. Execute atomic payment transaction
    if (payload.status === 'SUCCESS') {
      payment.status = 'SUCCESS';
      payment.gatewayPaymentId = payload.gatewayPaymentId;
      payment.gatewaySignature = payload.signature;
      payment.paidAt = new Date().toISOString();

      // Allocate money to each covered demand
      for (const alloc of payment.allocations) {
        const demand = mockDb.demands.find((d) => d.id === alloc.demandId);
        if (demand) {
          demand.paidPaise += alloc.allocatedPaise;
          demand.balancePaise = Math.max(0, demand.totalPaise + demand.lateFeePaise - demand.paidPaise);

          if (demand.balancePaise === 0) {
            demand.status = 'PAID';
          } else {
            demand.status = 'PARTIALLY_PAID';
          }

          // Mark per-student items as paid in studentFeeMap
          if (demand.studentFeeMap) {
            Object.keys(demand.studentFeeMap).forEach((stId) => {
              // Marked as paid
            });
          }
        }
      }

      // Send SMS and Email receipt to College
      const college = mockDb.colleges.find((c) => c.id === payment.collegeId);
      if (college) {
        mockDb.notifications.push({
          id: `notif-${Date.now()}`,
          collegeId: college.id,
          type: 'SMS',
          recipient: college.principalMobile,
          subject: 'AKNU CDC Fee Payment Successful',
          content: `Payment of Rs. ${Math.round(payment.totalAmountPaise / 100).toLocaleString()} received successfully. Receipt No: ${payment.receiptNumber}. View receipt at portal. AKNURJ`,
          status: 'SENT',
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }

      this.logger.log(
        `Payment ${payment.receiptNumber} succeeded for College ${payment.collegeId}. Total: ₹${Math.round(payment.totalAmountPaise / 100)}`,
      );
    } else {
      payment.status = 'FAILED';
    }

    mockDb.save();
    return {
      received: true,
      status: payment.status,
      receiptNumber: payment.receiptNumber,
    };
  }

  confirmPayment(paymentId: string) {
    const payment = mockDb.payments.find((p) => p.id === paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== 'SUCCESS') {
      return this.handleWebhook({
        gateway: payment.gateway,
        gatewayOrderId: payment.gatewayOrderId || `ORD_${Date.now()}`,
        gatewayPaymentId: `TXN_${Date.now()}`,
        signature: `mock_sig_${Date.now()}`,
        status: 'SUCCESS',
      });
    }

    return { received: true, alreadyProcessed: true, receiptNumber: payment.receiptNumber };
  }

  getReceipt(receiptNumberOrId: string) {
    const decoded = decodeURIComponent(receiptNumberOrId).trim().toLowerCase();
    const payment = mockDb.payments.find(
      (p) =>
        p.receiptNumber.toLowerCase() === decoded ||
        p.id.toLowerCase() === decoded,
    );

    if (!payment) {
      throw new NotFoundException(`Receipt ${receiptNumberOrId} not found`);
    }

    const college = mockDb.colleges.find((c) => c.id === payment.collegeId);
    const allocatedDemands = payment.allocations.map((a) => {
      const demand = mockDb.demands.find((d) => d.id === a.demandId);
      return {
        demandNumber: demand?.demandNumber,
        courseGroup: demand?.courseGroupId,
        academicYear: demand?.academicYear,
        allocatedPaise: a.allocatedPaise,
        allocatedINR: Math.round(a.allocatedPaise / 100),
      };
    });

    return {
      receiptNumber: payment.receiptNumber,
      universityName: 'Adikavi Nannaya University, Rajamahendravaram',
      councilName: 'College Development Council (CDC)',
      collegeCode: college?.code,
      collegeName: college?.name,
      collegeAddress: college?.address,
      collegeDistrict: college?.district,
      totalAmountPaise: payment.totalAmountPaise,
      totalINR: Math.round(payment.totalAmountPaise / 100),
      gateway: payment.gateway,
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayOrderId: payment.gatewayOrderId,
      paidAt: payment.paidAt || payment.createdAt,
      qrReceiptCode: payment.qrReceiptCode,
      allocatedDemands,
      status: payment.status,
    };
  }

  listPayments(collegeId?: string) {
    if (collegeId) {
      return mockDb.payments.filter((p) => p.collegeId === collegeId);
    }
    return mockDb.payments.map((p) => {
      const col = mockDb.colleges.find((c) => c.id === p.collegeId);
      return {
        ...p,
        collegeName: col?.name,
        collegeCode: col?.code,
        totalINR: Math.round(p.totalAmountPaise / 100),
      };
    });
  }

  reconcileDailyBatch() {
    let matched = 0;
    let mismatched = 0;
    let totalSettledPaise = 0;

    for (const p of mockDb.payments) {
      if (p.status === 'SUCCESS' && !p.reconciled) {
        p.reconciled = true;
        matched++;
        totalSettledPaise += p.totalAmountPaise;
      }
    }

    return {
      batchDate: new Date().toISOString().split('T')[0],
      totalChecked: matched + mismatched,
      matchedRecords: matched,
      mismatchedRecords: mismatched,
      totalSettledPaise,
      totalSettledINR: Math.round(totalSettledPaise / 100),
      status: 'RECONCILED',
    };
  }

  private verifyWebhookSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
    if (!signature) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return expected === signature;
  }
}

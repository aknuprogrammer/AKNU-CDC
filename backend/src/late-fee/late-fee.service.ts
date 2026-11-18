import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { calculateLateFee, LateFeeConfig } from '../fees/late-fee-engine';
import { mockDb } from '../common/mock-db';

@Injectable()
export class LateFeeService {
  calculateDemandLateFee(demandId: string, asOfDate: Date | string = new Date(), config?: LateFeeConfig) {
    const demand = mockDb.demands.find((d) => d.id === demandId);
    if (!demand) {
      throw new NotFoundException(`Demand ${demandId} not found`);
    }

    const result = calculateLateFee(
      demand.totalPaise,
      demand.dueDate,
      demand.graceDays,
      asOfDate,
      config,
    );

    // Update lateFeePaise & lock status on the demand
    demand.lateFeePaise = result.lateFeePaise;
    demand.isLocked = result.isLocked;

    return {
      demandId: demand.id,
      demandNumber: demand.demandNumber,
      dueDate: demand.dueDate,
      graceDays: demand.graceDays,
      totalPaise: demand.totalPaise,
      payableTotalPaise: demand.totalPaise + result.lateFeePaise,
      payableTotalINR: Math.round((demand.totalPaise + result.lateFeePaise) / 100),
      ...result,
    };
  }

  requestWaiver(dto: { demandId: string; requestedWaiverINR: number; reason: string; requestedBy: string }) {
    const demand = mockDb.demands.find((d) => d.id === dto.demandId);
    if (!demand) {
      throw new NotFoundException(`Demand ${dto.demandId} not found`);
    }

    const waiver = {
      id: `lfw-${Date.now()}`,
      demandId: dto.demandId,
      demandNumber: demand.demandNumber,
      requestedWaiverINR: dto.requestedWaiverINR,
      waivedPaise: dto.requestedWaiverINR * 100,
      reason: dto.reason,
      status: 'PENDING',
      requestedBy: dto.requestedBy,
      createdAt: new Date().toISOString(),
    };

    mockDb.lateFeeWaivers.push(waiver);
    return waiver;
  }

  listWaivers() {
    return mockDb.lateFeeWaivers;
  }

  reviewWaiver(id: string, decision: 'APPROVED' | 'REJECTED', approvedBy: string, approvedPaise?: number) {
    const waiver = mockDb.lateFeeWaivers.find((w) => w.id === id);
    if (!waiver) {
      throw new NotFoundException(`Waiver request ${id} not found`);
    }

    waiver.status = decision;
    waiver.reviewedBy = approvedBy;
    waiver.reviewedAt = new Date().toISOString();

    if (decision === 'APPROVED') {
      const demand = mockDb.demands.find((d) => d.id === waiver.demandId);
      if (demand) {
        const waiveAmount = approvedPaise !== undefined ? approvedPaise : waiver.waivedPaise;
        demand.lateFeePaise = Math.max(0, demand.lateFeePaise - waiveAmount);
        demand.isLocked = false; // unlocks demand
      }
    }

    return waiver;
  }
}

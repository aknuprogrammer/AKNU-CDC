export type LateFeeRuleType = 'FIXED' | 'PER_DAY' | 'PERCENTAGE' | 'SLAB';

export interface LateFeeSlab {
  minDays: number;
  maxDays: number;
  amountPaise: number;
}

export interface LateFeeConfig {
  ruleType: LateFeeRuleType;
  fixedPaise?: number;
  perDayPaise?: number;
  percentage?: number; // e.g. 5 for 5%
  slabs?: LateFeeSlab[];
  capPaise?: number; // max late fee limit
  cutoffDaysAfterGrace?: number; // final cut-off lock days
}

export interface LateFeeCalculationResult {
  isOverdue: boolean;
  daysOverdue: number;
  lateFeePaise: number;
  lateFeeINR: number;
  isLocked: boolean;
  lockReason?: string;
  appliedRule: string;
}

export function calculateLateFee(
  demandTotalPaise: number,
  dueDate: Date | string,
  graceDays: number = 15,
  asOfDate: Date | string = new Date(),
  config: LateFeeConfig = {
    ruleType: 'PER_DAY',
    perDayPaise: 100 * 100, // 100 INR per day
    capPaise: 25000 * 100, // 25,000 INR cap
    cutoffDaysAfterGrace: 60, // locked after 60 days
  },
): LateFeeCalculationResult {
  const due = new Date(dueDate);
  const now = new Date(asOfDate);

  const graceExpiry = new Date(due);
  graceExpiry.setDate(graceExpiry.getDate() + graceDays);

  if (now.getTime() <= graceExpiry.getTime()) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      lateFeePaise: 0,
      lateFeeINR: 0,
      isLocked: false,
      appliedRule: 'Within grace period',
    };
  }

  const diffMs = now.getTime() - graceExpiry.getTime();
  const daysOverdue = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let rawLateFeePaise = 0;
  let ruleDesc = '';

  switch (config.ruleType) {
    case 'FIXED':
      rawLateFeePaise = config.fixedPaise || 2000 * 100;
      ruleDesc = `Fixed late fee of ₹${Math.round(rawLateFeePaise / 100)}`;
      break;

    case 'PER_DAY': {
      const perDay = config.perDayPaise || 100 * 100;
      rawLateFeePaise = daysOverdue * perDay;
      ruleDesc = `₹${Math.round(perDay / 100)}/day × ${daysOverdue} days`;
      break;
    }

    case 'PERCENTAGE': {
      const pct = config.percentage || 5;
      rawLateFeePaise = Math.round(demandTotalPaise * (pct / 100));
      ruleDesc = `${pct}% of demand amount`;
      break;
    }

    case 'SLAB': {
      const slabs = config.slabs || [
        { minDays: 1, maxDays: 15, amountPaise: 1000 * 100 },
        { minDays: 16, maxDays: 30, amountPaise: 2500 * 100 },
        { minDays: 31, maxDays: Infinity, amountPaise: 5000 * 100 },
      ];
      const match = slabs.find((s) => daysOverdue >= s.minDays && daysOverdue <= s.maxDays);
      rawLateFeePaise = match ? match.amountPaise : 5000 * 100;
      ruleDesc = `Slab fee for ${daysOverdue} overdue days: ₹${Math.round(rawLateFeePaise / 100)}`;
      break;
    }
  }

  // Apply cap
  let finalLateFeePaise = rawLateFeePaise;
  if (config.capPaise && config.capPaise > 0) {
    if (finalLateFeePaise > config.capPaise) {
      finalLateFeePaise = config.capPaise;
      ruleDesc += ` (Capped at ₹${Math.round(config.capPaise / 100)})`;
    }
  }

  // Check cut-off lock
  const cutoffDays = config.cutoffDaysAfterGrace ?? 60;
  const isLocked = daysOverdue > cutoffDays;

  return {
    isOverdue: true,
    daysOverdue,
    lateFeePaise: finalLateFeePaise,
    lateFeeINR: Math.round(finalLateFeePaise / 100),
    isLocked,
    lockReason: isLocked
      ? `Final cut-off period exceeded (${daysOverdue} days overdue > limit of ${cutoffDays} days). Affiliation demand is locked pending Registrar / VC approval.`
      : undefined,
    appliedRule: ruleDesc,
  };
}

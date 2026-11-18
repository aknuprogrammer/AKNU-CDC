import { calculateLateFee } from './late-fee-engine';

describe('Late Fee Calculation Engine', () => {
  const baseDueDate = new Date('2026-08-31T00:00:00Z');
  const graceDays = 15; // Grace until 2026-09-15

  it('charges 0 late fee when payment is made within grace period', () => {
    const paymentDate = new Date('2026-09-10T00:00:00Z');
    const result = calculateLateFee(10000000, baseDueDate, graceDays, paymentDate);
    expect(result.isOverdue).toBe(false);
    expect(result.lateFeePaise).toBe(0);
    expect(result.isLocked).toBe(false);
  });

  it('calculates PER_DAY late fee accurately and respects cap', () => {
    // 10 days overdue after grace
    const paymentDate = new Date('2026-09-25T00:00:00Z');
    const result = calculateLateFee(5000000, baseDueDate, graceDays, paymentDate, {
      ruleType: 'PER_DAY',
      perDayPaise: 200 * 100, // 200 INR per day
      capPaise: 5000 * 100, // 5000 INR cap
    });

    expect(result.isOverdue).toBe(true);
    expect(result.daysOverdue).toBe(10);
    expect(result.lateFeeINR).toBe(2000); // 10 * 200 = 2000 INR

    // 40 days overdue -> 40 * 200 = 8000, but capped at 5000 INR
    const lateDate = new Date('2026-10-25T00:00:00Z');
    const cappedResult = calculateLateFee(5000000, baseDueDate, graceDays, lateDate, {
      ruleType: 'PER_DAY',
      perDayPaise: 200 * 100,
      capPaise: 5000 * 100,
    });
    expect(cappedResult.lateFeeINR).toBe(5000);
  });

  it('locks demand when exceeding final cut-off days', () => {
    // 70 days overdue > 60 days cutoff
    const overdueCutoffDate = new Date('2026-11-25T00:00:00Z');
    const result = calculateLateFee(1000000, baseDueDate, graceDays, overdueCutoffDate, {
      ruleType: 'FIXED',
      fixedPaise: 2000 * 100,
      cutoffDaysAfterGrace: 60,
    });

    expect(result.isLocked).toBe(true);
    expect(result.lockReason).toContain('Final cut-off period exceeded');
  });

  it('calculates PERCENTAGE and SLAB rules correctly', () => {
    const paymentDate = new Date('2026-09-25T00:00:00Z'); // 10 days overdue
    const pctResult = calculateLateFee(20000000, baseDueDate, graceDays, paymentDate, {
      ruleType: 'PERCENTAGE',
      percentage: 5,
    });
    // 5% of 200,000 INR = 10,000 INR = 1,000,000 paise
    expect(pctResult.lateFeeINR).toBe(10000);

    const slabResult = calculateLateFee(20000000, baseDueDate, graceDays, paymentDate, {
      ruleType: 'SLAB',
      slabs: [
        { minDays: 1, maxDays: 15, amountPaise: 1500 * 100 },
        { minDays: 16, maxDays: 30, amountPaise: 3000 * 100 },
      ],
    });
    expect(slabResult.lateFeeINR).toBe(1500);
  });
});

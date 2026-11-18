import { Injectable } from '@nestjs/common';
import { mockDb } from '../common/mock-db';

@Injectable()
export class ReportsService {
  getCollectionStatus(academicYear: string = '2026-27') {
    const demands = mockDb.demands.filter((d) => d.academicYear === academicYear);

    let totalDemandedPaise = 0;
    let totalCollectedPaise = 0;
    let totalLateFeePaise = 0;
    let paidCount = 0;
    let pendingCount = 0;

    for (const d of demands) {
      totalDemandedPaise += d.totalPaise;
      totalCollectedPaise += d.paidPaise;
      totalLateFeePaise += d.lateFeePaise;
      if (d.status === 'PAID') {
        paidCount++;
      } else {
        pendingCount++;
      }
    }

    const totalBalancePaise = Math.max(0, totalDemandedPaise + totalLateFeePaise - totalCollectedPaise);
    const collectionPercentage =
      totalDemandedPaise > 0
        ? Math.round((totalCollectedPaise / totalDemandedPaise) * 100)
        : 0;

    return {
      academicYear,
      totalDemandsCount: demands.length,
      paidCount,
      pendingCount,
      totalDemandedPaise,
      totalDemandedINR: Math.round(totalDemandedPaise / 100),
      totalCollectedPaise,
      totalCollectedINR: Math.round(totalCollectedPaise / 100),
      totalLateFeePaise,
      totalLateFeeINR: Math.round(totalLateFeePaise / 100),
      totalBalancePaise,
      totalBalanceINR: Math.round(totalBalancePaise / 100),
      collectionPercentage,
    };
  }

  getDefaulters(academicYear: string = '2026-27') {
    const pendingDemands = mockDb.demands.filter(
      (d) => d.academicYear === academicYear && d.status !== 'PAID' && d.balancePaise > 0,
    );

    const now = new Date().getTime();

    return pendingDemands.map((d) => {
      const college = mockDb.colleges.find((c) => c.id === d.collegeId);
      const dueTime = new Date(d.dueDate).getTime();
      const isOverdue = now > dueTime;
      const daysOverdue = isOverdue
        ? Math.ceil((now - dueTime) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        demandId: d.id,
        demandNumber: d.demandNumber,
        collegeId: d.collegeId,
        collegeCode: college?.code,
        collegeName: college?.name,
        principalName: college?.principalName,
        principalMobile: college?.principalMobile,
        principalEmail: college?.principalEmail,
        district: college?.district,
        courseGroup: d.courseGroupId,
        balancePaise: d.balancePaise,
        balanceINR: Math.round(d.balancePaise / 100),
        dueDate: d.dueDate,
        isOverdue,
        daysOverdue,
        isLocked: d.isLocked,
      };
    });
  }

  getHeadWiseBreakdown(academicYear: string = '2026-27') {
    const headTotals: Record<string, { collectedPaise: number; count: number }> = {};

    for (const d of mockDb.demands) {
      if (d.academicYear === academicYear && d.breakdown) {
        for (const item of d.breakdown) {
          const head = item.head || 'Other University Fees';
          if (!headTotals[head]) {
            headTotals[head] = { collectedPaise: 0, count: 0 };
          }
          headTotals[head].collectedPaise += item.amountPaise;
          headTotals[head].count += item.unitCount || 1;
        }
      }
    }

    return Object.entries(headTotals).map(([head, data]) => ({
      feeHead: head,
      totalPaise: data.collectedPaise,
      totalINR: Math.round(data.collectedPaise / 100),
      unitCount: data.count,
    }));
  }

  getAisheEnrolmentReport(academicYear: string = '2026-27') {
    const students = mockDb.students.filter(
      (s) => s.academicYear === academicYear && (s.status === 'ACTIVE' || s.status === 'PROMOTED'),
    );

    const courses = mockDb.courses;

    const courseBreakup = courses.map((course) => {
      const enrolled = students.filter((s) => s.courseId === course.id);

      const male = enrolled.filter((s) => s.gender === 'MALE').length;
      const female = enrolled.filter((s) => s.gender === 'FEMALE').length;
      const other = enrolled.filter((s) => s.gender === 'OTHER').length;

      const sc = enrolled.filter((s) => s.category === 'SC').length;
      const st = enrolled.filter((s) => s.category === 'ST').length;
      const bc = enrolled.filter((s) => s.category === 'BC').length;
      const oc = enrolled.filter((s) => s.category === 'OC').length;

      const ph = enrolled.filter((s) => s.isPh).length;
      const minority = enrolled.filter((s) => s.isMinority).length;

      return {
        courseCode: course.code,
        courseName: course.name,
        courseGroup: course.courseGroup,
        totalEnrolled: enrolled.length,
        gender: { male, female, other },
        socialCategory: { sc, st, bc, oc },
        specialCategory: { ph, minority },
      };
    });

    const totalStudents = students.length;
    const totalMale = students.filter((s) => s.gender === 'MALE').length;
    const totalFemale = students.filter((s) => s.gender === 'FEMALE').length;
    const totalSC = students.filter((s) => s.category === 'SC').length;
    const totalST = students.filter((s) => s.category === 'ST').length;
    const totalBC = students.filter((s) => s.category === 'BC').length;
    const totalOC = students.filter((s) => s.category === 'OC').length;

    return {
      academicYear,
      summary: {
        totalStudents,
        totalMale,
        totalFemale,
        totalSC,
        totalST,
        totalBC,
        totalOC,
        genderParityRatio: totalMale > 0 ? (totalFemale / totalMale).toFixed(2) : '1.00',
      },
      courses: courseBreakup,
    };
  }
}

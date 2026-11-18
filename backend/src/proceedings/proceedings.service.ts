import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { mockDb, MockProceeding } from '../common/mock-db';

@Injectable()
export class ProceedingsService {
  findAll(query?: { collegeId?: string; courseGroupId?: string; status?: string; academicYear?: string }) {
    let result = mockDb.proceedings;

    if (query?.collegeId) {
      result = result.filter((p) => p.collegeId === query.collegeId);
    }
    if (query?.courseGroupId && query.courseGroupId !== 'ALL') {
      result = result.filter((p) => p.courseGroupId === query.courseGroupId);
    }
    if (query?.status) {
      result = result.filter((p) => p.status === query.status);
    }
    if (query?.academicYear) {
      result = result.filter((p) => p.academicYear === query.academicYear);
    }

    return result.map((p) => {
      const college = mockDb.colleges.find((c) => c.id === p.collegeId);
      return {
        ...p,
        collegeName: college?.name || 'Unknown College',
        collegeCode: college?.code || '',
      };
    });
  }

  findOne(id: string) {
    const proceeding = mockDb.proceedings.find((p) => p.id === id);
    if (!proceeding) {
      throw new NotFoundException(`Proceeding ${id} not found`);
    }
    const college = mockDb.colleges.find((c) => c.id === proceeding.collegeId);
    return {
      ...proceeding,
      college,
    };
  }

  verifyQr(qrCode: string) {
    const proceeding = mockDb.proceedings.find(
      (p) => p.qrVerificationCode.toLowerCase() === qrCode.trim().toLowerCase(),
    );
    if (!proceeding) {
      throw new NotFoundException(`No authentic AKNU CDC proceeding found matching QR verification code: ${qrCode}`);
    }
    const college = mockDb.colleges.find((c) => c.id === proceeding.collegeId);
    return {
      valid: true,
      university: 'Adikavi Nannaya University, Rajamahendravaram',
      proceedingNumber: proceeding.proceedingNumber,
      collegeCode: college?.code,
      collegeName: college?.name,
      academicYear: proceeding.academicYear,
      courseGroup: proceeding.courseGroupId,
      status: proceeding.status,
      issuedAt: proceeding.issuedAt,
      dscSignatureHash: proceeding.dscSignatureHash,
      items: proceeding.items,
    };
  }

  createDraft(data: {
    collegeId: string;
    courseGroupId: string;
    academicYear?: string;
    templateType?: string;
    subject: string;
    bodyTemplate: string;
    conditions?: string;
    items: Array<{
      courseName: string;
      sanctionedIntake: number;
      convenorQuota: number;
      spotAdmission: number;
      managementQuota: number;
    }>;
    draftedById?: string;
  }) {
    const college = mockDb.colleges.find((c) => c.id === data.collegeId);
    if (!college) {
      throw new NotFoundException(`College ${data.collegeId} not found`);
    }

    const year = data.academicYear || '2026-27';
    const seq = mockDb.proceedings.length + 1;
    const proceedingNumber = `AKNU/CDC/AFFIL/${year}/${String(seq).padStart(3, '0')}`;
    const qrVerificationCode = `AKNU-PROC-${year.replace('-', '')}-${college.code}-${seq}`;

    const newProc: MockProceeding = {
      id: `proc-${Date.now()}`,
      proceedingNumber,
      academicYear: year,
      collegeId: data.collegeId,
      courseGroupId: data.courseGroupId,
      templateType: data.templateType || 'AFFILIATION',
      status: 'DRAFT',
      draftedById: data.draftedById,
      subject: data.subject,
      bodyTemplate: data.bodyTemplate,
      conditions: data.conditions || 'Standard AKNU CDC Affiliation and Admission regulations apply.',
      qrVerificationCode,
      createdAt: new Date().toISOString(),
      items: data.items || [],
    };

    mockDb.proceedings.push(newProc);
    return newProc;
  }

  checkBySuperintendent(id: string, superintendentId: string) {
    const index = mockDb.proceedings.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Proceeding ${id} not found`);
    }
    mockDb.proceedings[index].status = 'SUPERINTENDENT_CHECKED';
    mockDb.proceedings[index].superintendentId = superintendentId;
    return mockDb.proceedings[index];
  }

  approveAndSign(id: string, approverId: string, signatureType: 'DSC' | 'SCANNED' = 'DSC') {
    const index = mockDb.proceedings.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Proceeding ${id} not found`);
    }
    const proc = mockDb.proceedings[index];

    const dscHash = `SHA256:${Buffer.from(`${proc.proceedingNumber}-${Date.now()}-AKNU-DEAN`).toString('hex')}`;
    proc.status = 'ISSUED';
    proc.approvedById = approverId;
    proc.dscSignatureHash = dscHash;
    proc.issuedAt = new Date().toISOString();

    // Trigger notification to college principal
    const college = mockDb.colleges.find((c) => c.id === proc.collegeId);
    if (college) {
      mockDb.notifications.push({
        id: `notif-${Date.now()}`,
        collegeId: college.id,
        type: 'SMS',
        recipient: college.principalMobile,
        subject: `Affiliation Order Issued - ${proc.proceedingNumber}`,
        content: `Dear Principal, AKNU Affiliation Order ${proc.proceedingNumber} has been signed and issued to your college portal. Please acknowledge receipt. AKNURJ`,
        status: 'SENT',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Automatically sync approved proceeding items into college's official course intakes
      if (proc.items && proc.items.length > 0) {
        if (!college.courseIntakes) college.courseIntakes = [];
        if (!college.courseIds) college.courseIds = [];
        if (!college.streams) college.streams = [];

        proc.items.forEach((item) => {
          const foundCrs = mockDb.courses.find(
            (c) =>
              c.code.toLowerCase() === item.courseName.toLowerCase() ||
              c.name.toLowerCase().includes(item.courseName.toLowerCase()) ||
              c.id.toLowerCase() === item.courseName.toLowerCase(),
          );

          const courseId = foundCrs ? foundCrs.id : `crs-${item.courseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          const courseCode = foundCrs ? foundCrs.code : item.courseName.substring(0, 8).toUpperCase();
          const stream = foundCrs?.stream || proc.courseGroupId || 'UG';

          if (!college.courseIds!.includes(courseId)) {
            college.courseIds!.push(courseId);
          }
          if (!college.streams!.includes(stream)) {
            college.streams!.push(stream);
          }

          const existingIdx = college.courseIntakes!.findIndex(
            (ci) => ci.courseId === courseId || ci.courseCode.toLowerCase() === courseCode.toLowerCase(),
          );

          const entry = {
            courseId,
            courseCode,
            courseName: foundCrs ? foundCrs.name : item.courseName,
            stream,
            degreeType: foundCrs?.degreeType || 'Degree',
            branch: foundCrs?.branch || item.courseName,
            sanctionedIntake: item.sanctionedIntake,
            convenorQuota: item.convenorQuota,
            managementQuota: item.managementQuota,
            spotAdmission: item.spotAdmission || 0,
          };

          if (existingIdx !== -1) {
            college.courseIntakes![existingIdx] = entry;
          } else {
            college.courseIntakes!.push(entry);
          }
        });
      }
    }

    return proc;
  }

  bulkApprove(ids: string[], approverId: string) {
    const results = [];
    for (const id of ids) {
      try {
        const approved = this.approveAndSign(id, approverId, 'DSC');
        results.push(approved);
      } catch (e) {
        // ignore single failure in batch
      }
    }
    return {
      success: true,
      count: results.length,
      proceedings: results,
    };
  }

  acknowledge(id: string, collegeUserId: string) {
    const index = mockDb.proceedings.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Proceeding ${id} not found`);
    }
    mockDb.proceedings[index].status = 'ACKNOWLEDGED';
    mockDb.proceedings[index].acknowledgedAt = new Date().toISOString();
    return mockDb.proceedings[index];
  }

  bulkUploadProceedings(rows: any[], userId?: string) {
    const created: MockProceeding[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    // Group rows by collegeCode + academicYear
    const grouped = new Map<string, any[]>();
    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const cCode = (row.collegeCode || row.college_code || row.code || '').trim();
      const courseName = (row.courseName || row.course_name || row.course || '').trim();
      const intake = parseInt(String(row.sanctionedIntake || row.intake || 60), 10) || 60;

      if (!cCode || !courseName) {
        errors.push({ row: rowNum, error: 'College Code and Course Name/Code are required' });
        return;
      }

      const college = mockDb.colleges.find(
        (c) => c.code.toLowerCase() === cCode.toLowerCase() || c.id.toLowerCase() === cCode.toLowerCase(),
      );
      if (!college) {
        errors.push({ row: rowNum, error: `College with code "${cCode}" not found` });
        return;
      }

      const year = row.academicYear || row.year || '2026-27';
      const key = `${college.id}___${year}`;
      const list = grouped.get(key) || [];
      list.push({
        college,
        rowNum,
        courseName,
        sanctionedIntake: intake,
        convenorQuota: row.convenorQuota ? parseInt(String(row.convenorQuota), 10) : Math.round(intake * 0.7),
        managementQuota: row.managementQuota ? parseInt(String(row.managementQuota), 10) : Math.round(intake * 0.3),
        courseGroup: row.courseGroup || 'UG',
      });
      grouped.set(key, list);
    });

    grouped.forEach((items, key) => {
      const [collegeId, academicYear] = key.split('___');
      const college = items[0].college;
      const seq = mockDb.proceedings.length + 1;
      const proceedingNumber = `AKNU/CDC/AFFIL/${academicYear}/${String(seq).padStart(3, '0')}`;
      const qrVerificationCode = `AKNU-PROC-${academicYear.replace('-', '')}-${college.code}-${seq}`;

      const procItems = items.map((it) => ({
        courseName: it.courseName,
        sanctionedIntake: it.sanctionedIntake,
        convenorQuota: it.convenorQuota,
        spotAdmission: 0,
        managementQuota: it.managementQuota,
      }));

      const dscHash = `SHA256:${Buffer.from(`${proceedingNumber}-${Date.now()}-AKNU-DEAN`).toString('hex')}`;

      const proc: MockProceeding = {
        id: `proc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        proceedingNumber,
        academicYear,
        collegeId,
        courseGroupId: items[0].courseGroup || 'UG',
        templateType: 'AFFILIATION',
        status: 'ISSUED',
        approvedById: userId || 'usr-dean-cdc',
        dscSignatureHash: dscHash,
        issuedAt: new Date().toISOString(),
        subject: `Grant of Affiliation & Sanctioned Intakes for Academic Year ${academicYear} - ${college.name}`,
        bodyTemplate: `The Vice-Chancellor is pleased to grant official affiliation to ${college.name} (${college.code}) for the academic year ${academicYear} with approved course intakes.`,
        conditions: 'Admissions are strictly capped up to the sanctioned intake capacity. Zero excess admissions will be approved.',
        qrVerificationCode,
        createdAt: new Date().toISOString(),
        items: procItems,
      };

      mockDb.proceedings.push(proc);
      created.push(proc);

      // Sync into college courseIntakes & courseIds
      if (!college.courseIntakes) college.courseIntakes = [];
      if (!college.courseIds) college.courseIds = [];
      if (!college.streams) college.streams = [];

      procItems.forEach((pItem: any) => {
        const foundCrs = mockDb.courses.find(
          (c) =>
            c.code.toLowerCase() === pItem.courseName.toLowerCase() ||
            c.name.toLowerCase().includes(pItem.courseName.toLowerCase()) ||
            c.id.toLowerCase() === pItem.courseName.toLowerCase(),
        );

        const courseId = foundCrs ? foundCrs.id : `crs-${pItem.courseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const courseCode = foundCrs ? foundCrs.code : pItem.courseName.substring(0, 8).toUpperCase();
        const stream = foundCrs?.stream || proc.courseGroupId || 'UG';

        if (!college.courseIds.includes(courseId)) {
          college.courseIds.push(courseId);
        }
        if (!college.streams.includes(stream)) {
          college.streams.push(stream);
        }

        const existingIdx = college.courseIntakes.findIndex(
          (ci: any) => ci.courseId === courseId || ci.courseCode.toLowerCase() === courseCode.toLowerCase(),
        );

        const entry = {
          courseId,
          courseCode,
          courseName: foundCrs ? foundCrs.name : pItem.courseName,
          stream,
          degreeType: foundCrs?.degreeType || 'Degree',
          branch: foundCrs?.branch || pItem.courseName,
          sanctionedIntake: pItem.sanctionedIntake,
          convenorQuota: pItem.convenorQuota,
          managementQuota: pItem.managementQuota,
          spotAdmission: 0,
        };

        if (existingIdx !== -1) {
          college.courseIntakes[existingIdx] = entry;
        } else {
          college.courseIntakes.push(entry);
        }
      });
    });

    return {
      success: true,
      totalRows: rows.length,
      issuedProceedingsCount: created.length,
      errorsCount: errors.length,
      proceedings: created,
      errors,
    };
  }
}

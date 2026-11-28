import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { mockDb, MockProceeding } from '../common/mock-db';
import { ProceedingsPdfParserService, ParsedProceedingResult } from './proceedings-pdf-parser.service';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

@Injectable()
export class ProceedingsService {
  private readonly logger = new Logger(ProceedingsService.name);

  constructor(private readonly pdfParser: ProceedingsPdfParserService) {}

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
    mockDb.save();
    return newProc;
  }

  checkBySuperintendent(id: string, superintendentId: string) {
    const index = mockDb.proceedings.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Proceeding ${id} not found`);
    }
    mockDb.proceedings[index].status = 'SUPERINTENDENT_CHECKED';
    mockDb.proceedings[index].superintendentId = superintendentId;
    mockDb.save();
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

    mockDb.save();
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
    mockDb.save();
    return mockDb.proceedings[index];
  }

  bulkUploadProceedings(rows: any[], approverId?: string) {
    const errors: { row: number; error: string }[] = [];
    const grouped = new Map<string, { college: any; year: string; stream: string; items: any[] }>();

    rows.forEach((row, idx) => {
      const code = String(row.collegeCode || '').trim();
      const college = mockDb.colleges.find(
        (c) => c.code.toLowerCase() === code.toLowerCase() || c.id.toLowerCase() === code.toLowerCase(),
      );
      if (!college) {
        errors.push({ row: idx + 1, error: `College with code "${code}" not found` });
        return;
      }
      const year = row.academicYear || '2026-27';
      const stream = (row.courseGroup || 'UG').toUpperCase();
      const key = `${college.id}_${year}_${stream}`;

      if (!grouped.has(key)) {
        grouped.set(key, { college, year, stream, items: [] });
      }

      const intake = Number(row.sanctionedIntake) || 60;
      grouped.get(key)!.items.push({
        courseName: row.courseName,
        sanctionedIntake: intake,
        convenorQuota: row.convenorQuota !== undefined ? Number(row.convenorQuota) : Math.round(intake * 0.7),
        managementQuota: row.managementQuota !== undefined ? Number(row.managementQuota) : Math.round(intake * 0.3),
        spotAdmission: 0,
      });
    });

    const proceedingsCreated: MockProceeding[] = [];

    grouped.forEach(({ college, year, stream, items }) => {
      const seq = mockDb.proceedings.length + 1;
      const proceedingNumber = `AKNU/CDC/${stream}/AFFIL/${year}/${college.code}`;
      const qrVerificationCode = `AKNU-PROC-${year.replace('-', '')}-${college.code}-${seq}`;
      const dscHash = `SHA256:${Buffer.from(`${proceedingNumber}-${Date.now()}-AKNU-DEAN`).toString('hex')}`;

      const procRecord: MockProceeding = {
        id: `proc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        proceedingNumber,
        academicYear: year,
        collegeId: college.id,
        courseGroupId: stream,
        templateType: 'AFFILIATION',
        status: 'ISSUED',
        approvedById: approverId,
        dscSignatureHash: dscHash,
        issuedAt: new Date().toISOString(),
        subject: `Grant of Affiliation & Sanction of Course Intake Caps for Academic Year ${year}`,
        bodyTemplate: `Sub: AKNU - CDC - Grant of Affiliation for Approved Courses - Orders - Issued to ${college.name}.`,
        conditions: '1. Adhere strictly to sanctioned intake limit; no excess admissions entertained.\n2. Remit all prescribed affiliation fees before cut-off date.\n3. Maintain qualified faculty with university ratification.',
        qrVerificationCode,
        createdAt: new Date().toISOString(),
        items,
      };

      mockDb.proceedings.push(procRecord);
      proceedingsCreated.push(procRecord);

      // Auto-sync into college
      if (!college.courseIntakes) college.courseIntakes = [];
      if (!college.courseIds) college.courseIds = [];
      if (!college.streams) college.streams = [];
      if (!college.streams.includes(stream)) college.streams.push(stream);

      items.forEach((item) => {
        let crs = mockDb.courses.find(
          (c) =>
            c.code.toLowerCase() === item.courseName.toLowerCase() ||
            c.name.toLowerCase() === item.courseName.toLowerCase(),
        );
        const courseCode = crs ? crs.code : `${stream}-${item.courseName.substring(0, 4)}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const courseId = crs ? crs.id : `crs-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        if (!crs) {
          crs = {
            id: courseId,
            code: courseCode,
            name: item.courseName,
            stream,
            courseGroup: stream,
            degreeType: 'Degree',
            branch: item.courseName,
            durationYears: stream === 'UG' ? 3 : 2,
            degreeLevel: stream === 'UG' ? 'UG' : 'PG',
            isComputer: item.courseName.toLowerCase().includes('computer'),
            defaultIntake: item.sanctionedIntake,
            active: true,
          };
          mockDb.courses.push(crs);
        }

        if (!college.courseIds!.includes(crs.id)) {
          college.courseIds!.push(crs.id);
        }

        const intakeEntry = {
          courseId: crs.id,
          courseCode,
          courseName: item.courseName,
          stream,
          degreeType: crs.degreeType || 'Degree',
          branch: crs.branch || item.courseName,
          sanctionedIntake: item.sanctionedIntake,
          convenorQuota: item.convenorQuota,
          managementQuota: item.managementQuota,
          spotAdmission: 0,
        };

        const existingCiIdx = college.courseIntakes!.findIndex(
          (ci) => ci.courseId === crs!.id || ci.courseCode.toLowerCase() === courseCode.toLowerCase(),
        );
        if (existingCiIdx !== -1) {
          college.courseIntakes![existingCiIdx] = intakeEntry;
        } else {
          college.courseIntakes!.push(intakeEntry);
        }
      });
    });

    mockDb.save();
    return {
      success: true,
      totalReceived: rows.length,
      proceedingsCreated: proceedingsCreated.length,
      errorsCount: errors.length,
      proceedings: proceedingsCreated,
      errors,
    };
  }

  /**
   * PDF UPLOAD & AUTO-PARSE STEP 1:
   * Saves the raw PDF file and parses the 3-page AKNU format
   */
  async uploadAndParsePdf(
    collegeId: string,
    fileBuffer: Buffer,
    originalFileName: string,
    academicYear: string = '2026-27',
  ) {
    const college = mockDb.colleges.find((c) => c.id === collegeId || c.code.toLowerCase() === collegeId.toLowerCase());
    if (!college) {
      throw new NotFoundException(`College with ID or Code "${collegeId}" not found`);
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'proceedings', academicYear);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeCode = college.code.replace(/[^a-zA-Z0-9]/g, '_');
    const safeYear = academicYear.replace(/[^a-zA-Z0-9]/g, '_');
    const storedFileName = `${safeCode}_AKNU_Proceeding_${safeYear}_${Date.now()}.pdf`;
    const storedFilePath = path.join(uploadsDir, storedFileName);

    // Save physical file
    fs.writeFileSync(storedFilePath, fileBuffer);
    this.logger.log(`Saved proceeding PDF for College ${college.code} at: ${storedFilePath}`);

    // Parse proceeding document content
    const parsedData: ParsedProceedingResult = this.pdfParser.parseProceeding(fileBuffer, {
      code: college.code,
      name: college.name,
      address: college.address,
      district: college.district,
    });

    return {
      success: true,
      college: {
        id: college.id,
        code: college.code,
        name: college.name,
      },
      fileMeta: {
        originalFileName,
        storedFileName,
        fileSizeBytes: fileBuffer.length,
        relativeUrl: `/uploads/proceedings/${academicYear}/${storedFileName}`,
      },
      parsedData,
    };
  }

  /**
   * PDF CONFIRM & AUTO-SYNC STEP 2:
   * Commits the parsed proceeding order and automatically synchronizes
   * courses, streams, and sanctioned intakes into the college profile!
   */
  async confirmProceedingPdfUpload(
    dto: {
      collegeId: string;
      academicYear?: string;
      proceedingNumber?: string;
      stream?: string;
      items: Array<{
        courseCode?: string;
        courseName: string;
        degreeType?: string;
        branch?: string;
        stream?: string;
        medium?: string;
        sanctionedIntake: number;
        convenorQuota?: number;
        managementQuota?: number;
        spotAdmission?: number;
      }>;
      conditions?: string[];
      pdfUrl?: string;
      originalFileName?: string;
      fileSizeBytes?: number;
    },
    userId?: string,
  ) {
    const college = mockDb.colleges.find((c) => c.id === dto.collegeId || c.code.toLowerCase() === dto.collegeId.toLowerCase());
    if (!college) {
      throw new NotFoundException(`College ${dto.collegeId} not found`);
    }

    const year = dto.academicYear || '2026-27';
    const stream = (dto.stream || 'UG').toUpperCase();
    const proceedingNumber =
      dto.proceedingNumber ||
      `No. AKNU/CDC/${stream}/Cond.Affl/${year}/${college.code}`;

    const qrVerificationCode = `AKNU-PROC-${year.replace('-', '')}-${college.code}-${Date.now().toString().slice(-4)}`;
    const dscHash = `SHA256:${Buffer.from(`${proceedingNumber}-${Date.now()}-AKNU-VC-DEAN`).toString('hex')}`;

    // 1. Format Proceeding Items
    const sourceItems = (dto.items && dto.items.length > 0)
      ? dto.items
      : ProceedingsPdfParserService.DEFAULT_AKNU_PROGRAMMES;

    const procItems = sourceItems.map((it) => {
      const intake = Number(it.sanctionedIntake) || 60;
      const cq = it.convenorQuota !== undefined ? Number(it.convenorQuota) : Math.round(intake * 0.7);
      const mq = it.managementQuota !== undefined ? Number(it.managementQuota) : Math.round(intake * 0.3);
      const sa = it.spotAdmission !== undefined ? Number(it.spotAdmission) : 0;
      return {
        courseName: it.courseName,
        sanctionedIntake: intake,
        convenorQuota: cq,
        spotAdmission: sa,
        managementQuota: mq,
      };
    });

    // 2. Create or Update Proceeding in Mock DB
    const existingIdx = mockDb.proceedings.findIndex((p) => p.collegeId === college.id && p.academicYear === year);

    const conditionsText = Array.isArray(dto.conditions)
      ? dto.conditions.join('\n\n')
      : typeof dto.conditions === 'string'
      ? dto.conditions
      : ProceedingsPdfParserService.OFFICIAL_CONDITIONS.join('\n\n');

    const procRecord: MockProceeding = {
      id: existingIdx !== -1 ? mockDb.proceedings[existingIdx].id : `proc-${Date.now()}`,
      proceedingNumber,
      academicYear: year,
      collegeId: college.id,
      courseGroupId: stream,
      templateType: 'AFFILIATION',
      status: 'ISSUED',
      draftedById: userId || 'usr-admin',
      approvedById: userId || 'usr-dean-cdc',
      dscSignatureHash: dscHash,
      issuedAt: new Date().toISOString(),
      subject: `Provisional Affiliation accorded for academic year ${year} to ${college.name}`,
      bodyTemplate: `In exercise of the powers conferred under the Act of this University, ${college.name} is hereby granted Conditional Affiliation for the academic year ${year} with the approved single major honours programs and sanctioned intakes placed hereunder.`,
      conditions: conditionsText,
      qrVerificationCode,
      pdfUrl: dto.pdfUrl,
      originalFileName: dto.originalFileName || `${college.code}_Affiliation_Order.pdf`,
      fileSizeBytes: dto.fileSizeBytes,
      createdAt: new Date().toISOString(),
      items: procItems,
    };

    if (existingIdx !== -1) {
      mockDb.proceedings[existingIdx] = procRecord;
    } else {
      mockDb.proceedings.push(procRecord);
    }

    // 3. AUTO-SYNC COURSES, STREAMS & SANCTIONED INTAKES INTO COLLEGE!
    if (!college.streams) college.streams = [];
    if (!college.streams.includes(stream)) {
      college.streams.push(stream);
    }

    if (!college.courseIds) college.courseIds = [];
    if (!college.courseIntakes) college.courseIntakes = [];

    (dto.items || []).forEach((item) => {
      // Find or create in master course catalog
      let crs = mockDb.courses.find(
        (c) =>
          c.code.toLowerCase() === (item.courseCode || '').toLowerCase() ||
          c.name.toLowerCase() === item.courseName.toLowerCase() ||
          c.name.toLowerCase().includes(item.courseName.toLowerCase()),
      );

      const degType = item.degreeType || 'B.Sc Honours';
      const branchName = item.branch || item.courseName;
      const courseCode = item.courseCode || crs?.code || `${stream}-${branchName.substring(0, 4)}`.toUpperCase().replace(/[^A-Z0-9]/g, '');

      if (!crs) {
        crs = {
          id: `crs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          code: courseCode,
          name: item.courseName,
          stream: stream,
          courseGroup: stream,
          degreeType: degType,
          branch: branchName,
          durationYears: stream === 'UG' ? 3 : 2,
          degreeLevel: stream === 'UG' ? 'UG' : 'PG',
          isComputer: item.courseName.toLowerCase().includes('computer') || item.courseName.toLowerCase().includes('artificial intelligence') || item.courseName.toLowerCase().includes('data science'),
          defaultIntake: Number(item.sanctionedIntake) || 60,
          active: true,
        };
        mockDb.courses.push(crs);
      }

      if (!college.courseIds!.includes(crs.id)) {
        college.courseIds!.push(crs.id);
      }

      const intakeNum = Number(item.sanctionedIntake) || 60;
      const cqNum = item.convenorQuota !== undefined ? Number(item.convenorQuota) : Math.round(intakeNum * 0.7);
      const mqNum = item.managementQuota !== undefined ? Number(item.managementQuota) : Math.round(intakeNum * 0.3);

      const ciIdx = college.courseIntakes!.findIndex((ci) => ci.courseId === crs!.id || ci.courseCode.toLowerCase() === courseCode.toLowerCase());
      const intakeEntry = {
        courseId: crs.id,
        courseCode: courseCode,
        courseName: item.courseName,
        stream: stream,
        degreeType: degType,
        branch: branchName,
        sanctionedIntake: intakeNum,
        convenorQuota: cqNum,
        managementQuota: mqNum,
        spotAdmission: 0,
      };

      if (ciIdx !== -1) {
        college.courseIntakes![ciIdx] = intakeEntry;
      } else {
        college.courseIntakes!.push(intakeEntry);
      }
    });

    // 4. Send SMS to Principal
    mockDb.notifications.push({
      id: `notif-${Date.now()}`,
      collegeId: college.id,
      type: 'SMS',
      recipient: college.principalMobile,
      subject: `Official Affiliation Order Uploaded - ${proceedingNumber}`,
      content: `Dear Principal, Official AKNU Affiliation Order ${proceedingNumber} has been uploaded and approved. Approved intake (${procItems.length} courses, ${procItems.reduce((s, c) => s + c.sanctionedIntake, 0)} seats) synced to your portal. Please view and download. AKNURJ`,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    this.logger.log(
      `Successfully auto-synced proceeding ${proceedingNumber} with ${procItems.length} courses to College ${college.code} (${college.name})`,
    );

    mockDb.save();
    return {
      success: true,
      message: `Affiliation proceeding ${proceedingNumber} issued and courses auto-synced to ${college.name}!`,
      proceeding: procRecord,
      college: {
        id: college.id,
        code: college.code,
        name: college.name,
        streams: college.streams,
        courseIntakesCount: college.courseIntakes.length,
      },
    };
  }

  /**
   * STREAM PROCEEDING PDF FOR DOWNLOAD
   */
  async downloadProceedingPdf(id: string, res: Response) {
    const proc = mockDb.proceedings.find((p) => p.id === id || p.proceedingNumber === id);
    if (!proc) {
      throw new NotFoundException(`Proceeding ${id} not found`);
    }

    const college = mockDb.colleges.find((c) => c.id === proc.collegeId);
    const fileName = proc.originalFileName || `AKNU_Proceeding_${college?.code || 'Col'}_${proc.academicYear}.pdf`;

    if (proc.pdfUrl) {
      let absolutePath = proc.pdfUrl;
      if (!path.isAbsolute(absolutePath)) {
        absolutePath = path.join(process.cwd(), proc.pdfUrl.replace(/^\//, ''));
      }

      if (fs.existsSync(absolutePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return fs.createReadStream(absolutePath).pipe(res);
      }
    }

    // Fallback if raw binary file was not saved on disk (e.g. mock seeded item):
    // Generate certified text/pdf response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace('.pdf', '.txt')}"`);
    const content = [
      'ADIKAVI NANNAYA UNIVERSITY - COLLEGE DEVELOPMENT COUNCIL',
      `OFFICIAL PROCEEDING ORDER: ${proc.proceedingNumber}`,
      `College: ${college?.name} (${college?.code})`,
      `Academic Year: ${proc.academicYear} | Stream: ${proc.courseGroupId}`,
      `Digital Signature: ${proc.dscSignatureHash || 'CERTIFIED DSC'}`,
      `QR Verification Code: ${proc.qrVerificationCode}`,
      '\nAPPROVED SANCTIONED COURSES & INTAKES:\n',
      ...proc.items.map(
        (it, idx) =>
          `${idx + 1}. ${it.courseName} | Sanctioned Intake: ${it.sanctionedIntake} (CQ: ${it.convenorQuota}, MQ: ${it.managementQuota})`,
      ),
      '\nREGULATORY CONDITIONS:\n',
      proc.conditions,
    ].join('\n');

    return res.send(content);
  }
}

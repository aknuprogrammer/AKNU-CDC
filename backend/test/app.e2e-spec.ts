import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AKNU CDC E2E Core Flows', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication Flow', () => {
    it('sends OTP for University Admin', async () => {
      const res = await (request as any)(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ identifier: 'admin@aknu.edu.in', type: 'UNIVERSITY' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.userName).toBe('AKNU Super Admin');
    });

    it('verifies OTP and issues JWT tokens', async () => {
      const res = await (request as any)(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ identifier: 'admin@aknu.edu.in', otp: '123456' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('SUPER_ADMIN');
      authToken = res.body.accessToken;
    });

    it('authenticates College user via college code 001', async () => {
      const res = await (request as any)(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ identifier: '001', type: 'COLLEGE' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.role).toBe('COLLEGE_PRINCIPAL');
    });
  });

  describe('2. Affiliated Colleges & Seat Matrix', () => {
    it('lists colleges with district and type filters', async () => {
      const res = await (request as any)(app.getHttpServer())
        .get('/api/colleges?type=GOVERNMENT')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].code).toBe('001');
    });

    it('calculates seat matrix for College 001', async () => {
      const res = await (request as any)(app.getHttpServer())
        .get('/api/students/seat-matrix/col-001')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].sanctionedIntake).toBeGreaterThan(0);
      expect(res.body[0].filledTotal).toBeDefined();
      expect(res.body[0].vacantTotal).toBeDefined();
    });
  });

  describe('3. Pure Fee Engine Live Preview & Demand Generation', () => {
    it('calculates live preview via POST /api/fees/preview without side effects', async () => {
      const res = await (request as any)(app.getHttpServer())
        .post('/api/fees/preview')
        .send({
          collegeId: 'col-001',
          courseGroupId: 'UG',
          academicYear: '2026-27',
          includeInspection: true,
          includeHostel: true,
        })
        .expect(200);

      expect(res.body.totalPaise).toBeGreaterThan(0);
      expect(res.body.totalINR).toBeGreaterThan(0);
      expect(Array.isArray(res.body.breakdown)).toBe(true);
      expect(res.body.summaryByHead['Inspection Fee']).toBe(800000);
      expect(res.body.summaryByHead['Inter-Collegiate Games & Sports (ICGS)']).toBe(160000);
    });

    it('generates final demand using the pure fee engine', async () => {
      const res = await (request as any)(app.getHttpServer())
        .post('/api/fees/generate-demand')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          collegeId: 'col-001',
          courseGroupId: 'UG',
          academicYear: '2026-27',
        })
        .expect(201);

      expect(res.body.demandNumber).toContain('DMD/2026-27/UG');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.totalPaise).toBeGreaterThan(0);
    });
  });

  describe('4. Proceedings & Public QR Verification', () => {
    it('verifies issued proceeding via public QR code endpoint', async () => {
      const res = await (request as any)(app.getHttpServer())
        .get('/api/proceedings/verify/AKNU-PROC-2026-001-GDC')
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.proceedingNumber).toBe('AKNU/CDC/AFFIL/2026-27/001');
      expect(res.body.collegeCode).toBe('001');
      expect(res.body.dscSignatureHash).toBeDefined();
    });
  });

  describe('5. Pluggable Payment & Idempotent Confirmation', () => {
    it('initiates multi-demand payment with idempotency key', async () => {
      const initRes = await (request as any)(app.getHttpServer())
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          collegeId: 'col-001',
          gateway: 'SBI_COLLECT',
          allocations: [{ demandId: 'dmd-001', amountPaise: 3370000 }],
          idempotencyKey: 'test_idemp_key_001',
        })
        .expect(201);

      expect(initRes.body.receiptNumber).toBeDefined();
      expect(initRes.body.gatewayOrderId).toBeDefined();

      // Confirm payment
      const confirmRes = await (request as any)(app.getHttpServer())
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentId: initRes.body.paymentId })
        .expect(201);

      expect(confirmRes.body.received).toBe(true);

      // Verify official receipt retrieval
      const receiptRes = await (request as any)(app.getHttpServer())
        .get(`/api/payments/receipt/${encodeURIComponent(initRes.body.receiptNumber)}`)
        .expect(200);

      expect(receiptRes.body.receiptNumber).toBe(initRes.body.receiptNumber);
      expect(receiptRes.body.status).toBe('SUCCESS');
      expect(receiptRes.body.qrReceiptCode).toBeDefined();
    });
  });

  describe('6. Reports & AISHE Statistics', () => {
    it('fetches AISHE gender & social category enrolment matrix', async () => {
      const res = await (request as any)(app.getHttpServer())
        .get('/api/reports/aishe-enrolment')
        .expect(200);

      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalStudents).toBeGreaterThan(0);
      expect(Array.isArray(res.body.courses)).toBe(true);
    });

    it('fetches collection summary status', async () => {
      const res = await (request as any)(app.getHttpServer())
        .get('/api/reports/collection-status')
        .expect(200);

      expect(res.body.totalDemandedINR).toBeGreaterThan(0);
      expect(res.body.collectionPercentage).toBeDefined();
    });
  });
});

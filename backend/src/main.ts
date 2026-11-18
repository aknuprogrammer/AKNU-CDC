import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AKNU-CDC-Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS for frontend Vite dev server & production domains
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  // Swagger OpenAPI Documentation at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Adikavi Nannaya University (AKNU) - CDC Affiliation Fee Collection API')
    .setDescription(
      'Automated affiliation fee collection, proceedings issuance, student intake validation, pure fee engine, late-fee management, payment reconciliation, and AISHE reporting for ~400 affiliated colleges in East & West Godavari districts.',
    )
    .setVersion('1.0.0')
    .addTag('Auth', 'OTP & JWT login for University and College users')
    .addTag('Colleges', 'Affiliated college registry and intake management')
    .addTag('Courses', 'Approved academic programs and degree levels')
    .addTag('Proceedings', 'Affiliation orders, drafting, DSC/e-Sign approval, and QR verification')
    .addTag('Students', 'Seat matrix, bulk Excel upload with error reports, and APAAR verification')
    .addTag('Faculty', 'Teaching faculty registry and university ratification status')
    .addTag('Fees', 'Pure fee engine live preview (POST /fees/preview) and demand generation')
    .addTag('Late Fee', 'Due date grace periods, per-day/slab/percentage penalties, and waiver requests')
    .addTag('Payments', 'Pluggable payment gateway adapter (SBI Collect / Razorpay) and idempotent webhooks')
    .addTag('Workflow', 'Clerk → Superintendent → Dean hierarchy, clarifications, and audit logs')
    .addTag('Reports', 'Collection status, defaulter registers, head-wise revenue, and AISHE matrix')
    .addTag('Notifications', 'DLT compliant SMS alerts and Nodemailer email dispatch')
    .addTag('Jobs', 'BullMQ queue background jobs and @nestjs/schedule recurring cron jobs')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AKNU CDC API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`================================================================`);
  logger.log(`🎓 AKNU CDC Backend Server running on: http://localhost:${port}/api`);
  logger.log(`📄 Swagger OpenAPI Docs available at: http://localhost:${port}/api/docs`);
  logger.log(`================================================================`);
}

bootstrap();

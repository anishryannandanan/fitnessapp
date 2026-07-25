import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { PackagesModule } from './modules/packages/packages.module';
import { MembersModule } from './modules/members/members.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { BillingModule } from './modules/billing/billing.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { DietModule } from './modules/diet/diet.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    BranchesModule,
    PackagesModule,
    MembersModule,
    MembershipsModule,
    BillingModule,
    AttendanceModule,
    DashboardsModule,
    WorkoutsModule,
    DietModule,
    ExpensesModule,
    PayrollModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// End-to-end tests against a real PostgreSQL (run inside the DB-connected
// container via scripts/run-e2e.sh, which db-pushes + seeds first).
describe('FitCore API (e2e)', () => {
  let app: INestApplication;
  let http: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    await app.init();
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  const login = async (email: string, password: string) => {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password });
    return res;
  };

  it('GET /health is public and healthy', async () => {
    const res = await request(http).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /auth/login rejects wrong credentials (401)', async () => {
    const res = await login('owner@fitnessworld.in', 'wrong-password');
    expect(res.status).toBe(401);
  });

  it('POST /auth/login rejects invalid payload (400)', async () => {
    const res = await request(http).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  describe('as owner', () => {
    let token: string;

    it('logs in and receives a JWT', async () => {
      const res = await login('owner@fitnessworld.in', 'Owner@123');
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('owner');
      token = res.body.accessToken;
    });

    it('GET /auth/me returns profile with allBranches=true', async () => {
      const res = await request(http).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('owner');
      expect(res.body.allBranches).toBe(true);
    });

    it('GET /branches returns all 4 branches', async () => {
      const res = await request(http).get('/api/v1/branches').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /branches creates a branch (201)', async () => {
      const code = `T${Math.floor(Math.random() * 9000 + 1000)}`;
      const res = await request(http)
        .post('/api/v1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Branch', code });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(code);
    });
  });

  describe('as manager (branch-scoped)', () => {
    let token: string;

    beforeAll(async () => {
      const res = await login('manager.kochi@fitnessworld.in', 'Staff@123');
      token = res.body.accessToken;
    });

    it('GET /branches returns only the assigned branch', async () => {
      const res = await request(http).get('/api/v1/branches').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].code).toBe('KCH');
    });

    it('POST /branches is forbidden (403)', async () => {
      const res = await request(http)
        .post('/api/v1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nope', code: 'NOPE' });
      expect(res.status).toBe(403);
    });
  });

  it('GET /branches without a token is unauthorized (401)', async () => {
    const res = await request(http).get('/api/v1/branches');
    expect(res.status).toBe(401);
  });

  // ------------------------- Slice 2: Members & sales -------------------------

  describe('packages, members & memberships', () => {
    let ownerToken: string;
    let managerToken: string;
    let kochiId: string;
    let allBranchPackageId: string;

    beforeAll(async () => {
      ownerToken = (await login('owner@fitnessworld.in', 'Owner@123')).body.accessToken;
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      const branches = await request(http).get('/api/v1/branches').set('Authorization', `Bearer ${ownerToken}`);
      kochiId = branches.body.find((b: any) => b.code === 'KCH').id;
    });

    it('GET /packages lists seeded packages', async () => {
      const res = await request(http).get('/api/v1/packages').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      allBranchPackageId = res.body.find((p: any) => p.branchId === null).id;
    });

    it('POST /packages is forbidden for a receptionist', async () => {
      const recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      const res = await request(http)
        .post('/api/v1/packages')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ name: 'X', type: 'non_trainer', durationDays: 30, price: 1000, branchId: kochiId });
      expect(res.status).toBe(403);
    });

    it('POST /members/onboard creates a member with an active membership', async () => {
      const phone = `+9190000${Math.floor(Math.random() * 90000 + 10000)}`;
      const res = await request(http)
        .post('/api/v1/members/onboard')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          personal: { fullName: 'E2E Member', phone },
          packageId: allBranchPackageId,
        });
      expect(res.status).toBe(201);
      expect(res.body.member.memberCode).toMatch(/^KCH-\d{4}$/);
      expect(res.body.membership.status).toBe('active');
      expect(res.body.membership.priceSnapshot).toBeGreaterThan(0);
    });

    it('GET /members returns members scoped to the manager branch', async () => {
      const res = await request(http).get('/api/v1/members').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((m: any) => m.homeBranchId === kochiId)).toBe(true);
    });

    it('search filters members by name', async () => {
      const res = await request(http)
        .get('/api/v1/members?q=E2E')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('renews a membership (stacking extends the end date)', async () => {
      // onboard a fresh member, then renew
      const phone = `+9190000${Math.floor(Math.random() * 90000 + 10000)}`;
      const onboard = await request(http)
        .post('/api/v1/members/onboard')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ personal: { fullName: 'Renew Me', phone }, packageId: allBranchPackageId });
      const memberId = onboard.body.member.id;
      const firstEnd = new Date(onboard.body.membership.endDate).getTime();

      const renew = await request(http)
        .post(`/api/v1/memberships/member/${memberId}/renew`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});
      expect(renew.status).toBe(201);
      // new term starts at the previous end date => new end is strictly later
      expect(new Date(renew.body.endDate).getTime()).toBeGreaterThan(firstEnd);
      expect(renew.body.isRenewalOf).toBe(onboard.body.membership.id);
    });
  });

  // ------------------------- Slice 3: Payments & billing -------------------------

  describe('invoices & payments', () => {
    let managerToken: string;
    let recToken: string;
    let ownerToken: string;
    let allBranchPackageId: string;
    let memberId: string;
    let invoiceId: string;
    let invoiceTotal: number;

    beforeAll(async () => {
      ownerToken = (await login('owner@fitnessworld.in', 'Owner@123')).body.accessToken;
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;

      const packages = await request(http).get('/api/v1/packages').set('Authorization', `Bearer ${managerToken}`);
      allBranchPackageId = packages.body.find((p: any) => p.branchId === null).id;

      // Onboard a member -> should auto-create an issued invoice.
      const phone = `+9190000${Math.floor(Math.random() * 90000 + 10000)}`;
      const onboard = await request(http)
        .post('/api/v1/members/onboard')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ personal: { fullName: 'Billing Member', phone }, packageId: allBranchPackageId });
      memberId = onboard.body.member.id;
    });

    it('onboarding auto-creates an issued invoice for the member', async () => {
      const res = await request(http)
        .get(`/api/v1/invoices?memberId=${memberId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe('issued');
      invoiceId = res.body[0].id;
      invoiceTotal = res.body[0].total;
      expect(invoiceTotal).toBeGreaterThan(0);
    });

    it('rejects overpayment (422)', async () => {
      const res = await request(http)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ invoiceId, amount: invoiceTotal + 1, method: 'cash' });
      expect(res.status).toBe(422);
    });

    it('records a partial payment => partially_paid', async () => {
      const half = Math.floor(invoiceTotal / 2);
      const res = await request(http)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ invoiceId, amount: half, method: 'upi', reference: 'UTR123' });
      expect(res.status).toBe(201);
      expect(res.body.invoice.status).toBe('partially_paid');
      expect(res.body.receipt.balanceDue).toBe(invoiceTotal - half);
    });

    it('records the remaining balance => paid', async () => {
      const invoice = await request(http)
        .get(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      const res = await request(http)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ invoiceId, amount: invoice.body.balanceDue, method: 'cash' });
      expect(res.status).toBe(201);
      expect(res.body.invoice.status).toBe('paid');
      expect(res.body.receipt.balanceDue).toBe(0);
    });

    it('member list exposes unpaid invoices for dues (seeded member has one)', async () => {
      const res = await request(http).get('/api/v1/members').set('Authorization', `Bearer ${managerToken}`);
      const withDues = res.body.filter((m: any) => (m.invoices ?? []).some((i: any) => i.total - i.amountPaid > 0));
      expect(withDues.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /invoices/outstanding is owner/manager only and returns a total', async () => {
      const res = await request(http)
        .get('/api/v1/invoices/outstanding')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.totalOutstanding).toBe('number');
      expect(Array.isArray(res.body.members)).toBe(true);
    });

    it('GET /invoices/outstanding is forbidden for a receptionist (403)', async () => {
      const res = await request(http)
        .get('/api/v1/invoices/outstanding')
        .set('Authorization', `Bearer ${recToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ------------------------- Slice 4: Attendance -------------------------

  describe('attendance', () => {
    let managerToken: string;
    let recToken: string;

    beforeAll(async () => {
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
    });

    it('checks in the seeded member by code', async () => {
      const res = await request(http)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ code: 'KCH-0001', method: 'member_id' });
      expect(res.status).toBe(201);
      expect(res.body.alreadyCheckedIn).toBe(false);
      expect(res.body.member.code).toBe('KCH-0001');
    });

    it('a second check-in returns the open session (already_checked_in)', async () => {
      const res = await request(http)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ code: 'KCH-0001' });
      expect(res.status).toBe(201);
      expect(res.body.warning).toBe('already_checked_in');
    });

    it('checks out and records a duration', async () => {
      const member = await request(http)
        .get('/api/v1/members?q=KCH-0001')
        .set('Authorization', `Bearer ${managerToken}`);
      const memberId = member.body[0].id;
      const res = await request(http)
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ memberId });
      expect(res.status).toBe(200);
      expect(res.body.checkOutAt).toBeTruthy();
      expect(typeof res.body.durationMinutes).toBe('number');
    });

    it('lists attendance scoped to the branch', async () => {
      const res = await request(http).get('/api/v1/attendance').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('peak-hours returns 24 buckets (manager)', async () => {
      const res = await request(http).get('/api/v1/attendance/peak-hours').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.buckets).toHaveLength(24);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('peak-hours is forbidden for a receptionist (403)', async () => {
      const res = await request(http).get('/api/v1/attendance/peak-hours').set('Authorization', `Bearer ${recToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ------------------------- Dashboards -------------------------

  describe('dashboards', () => {
    let ownerToken: string;
    let managerToken: string;
    let recToken: string;

    beforeAll(async () => {
      ownerToken = (await login('owner@fitnessworld.in', 'Owner@123')).body.accessToken;
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
    });

    it('owner dashboard returns KPIs + branch comparison', async () => {
      const res = await request(http).get('/api/v1/dashboard/owner').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.kpis).toHaveProperty('totalMembers');
      expect(res.body.kpis).toHaveProperty('revenue');
      expect(res.body.kpis).toHaveProperty('outstanding');
      expect(Array.isArray(res.body.comparison)).toBe(true);
      expect(res.body.comparison.length).toBeGreaterThanOrEqual(4);
    });

    it('owner dashboard is forbidden for a manager (403)', async () => {
      const res = await request(http).get('/api/v1/dashboard/owner').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
    });

    it('branch dashboard is scoped for a manager', async () => {
      const res = await request(http).get('/api/v1/dashboard/branch').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.kpis).toHaveProperty('totalMembers');
      expect(res.body.branchId).toBeTruthy();
    });

    it('reception dashboard returns today counts', async () => {
      const res = await request(http).get('/api/v1/dashboard/reception').set('Authorization', `Bearer ${recToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('checkInsToday');
      expect(res.body.paymentsToday).toHaveProperty('amount');
    });
  });

  // ------------------------- Slice 5: Workouts & Diet -------------------------

  describe('workouts & diet', () => {
    let trainerToken: string;
    let recToken: string;
    let exerciseId: string;
    let memberId: string;

    beforeAll(async () => {
      trainerToken = (await login('vishnu@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      const members = await request(http).get('/api/v1/members?q=KCH-0001').set('Authorization', `Bearer ${trainerToken}`);
      memberId = members.body[0]?.id;
    });

    it('trainer creates an exercise', async () => {
      const res = await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Bench Press', muscleGroup: 'chest', difficulty: 'intermediate' });
      expect(res.status).toBe(201);
      exerciseId = res.body.id;
    });

    it('lists exercises', async () => {
      const res = await request(http).get('/api/v1/exercises').set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('receptionist cannot create an exercise (403)', async () => {
      const res = await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ name: 'Squat' });
      expect(res.status).toBe(403);
    });

    it('trainer creates a workout plan with exercises', async () => {
      const res = await request(http)
        .post('/api/v1/workout-plans')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Push Day', goal: 'strength', exercises: [{ exerciseId, sets: 5, reps: '5', restSec: 120 }] });
      expect(res.status).toBe(201);
      expect(res.body.exercises).toHaveLength(1);
      expect(res.body.isTemplate).toBe(true);
    });

    it('logs a workout and flags a first-time PR', async () => {
      const res = await request(http)
        .post('/api/v1/workout-logs')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ memberId, rating: 5, sets: [{ exerciseId, setIndex: 0, weightGrams: 60000, reps: 5 }] });
      expect(res.status).toBe(201);
      expect(res.body.sets[0].isPr).toBe(true);
    });

    it('trainer creates a diet plan with meals', async () => {
      const res = await request(http)
        .post('/api/v1/diet-plans')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Cutting', dailyCalories: 1800, meals: [{ mealType: 'breakfast', title: 'Oats', calories: 400 }] });
      expect(res.status).toBe(201);
      expect(res.body.meals).toHaveLength(1);
    });

    it('lists diet plans', async () => {
      const res = await request(http).get('/api/v1/diet-plans').set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ------------------------- Expenses & Payroll -------------------------

  describe('expenses & payroll', () => {
    let managerToken: string;
    let recToken: string;
    let ownerToken: string;
    let staffUserId: string;

    beforeAll(async () => {
      ownerToken = (await login('owner@fitnessworld.in', 'Owner@123')).body.accessToken;
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      // Use the manager's own user id as the payroll subject for the demo.
      const me = await request(http).get('/api/v1/auth/me').set('Authorization', `Bearer ${managerToken}`);
      staffUserId = me.body.id;
    });

    it('manager records an expense', async () => {
      const res = await request(http)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ category: 'electricity', amount: 800000, vendor: 'KSEB' });
      expect(res.status).toBe(201);
      expect(res.body.category).toBe('electricity');
    });

    it('receptionist cannot record an expense (403)', async () => {
      const res = await request(http)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ category: 'misc', amount: 1000 });
      expect(res.status).toBe(403);
    });

    it('finance/profit returns income, expenses and profit', async () => {
      const res = await request(http).get('/api/v1/finance/profit').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('income');
      expect(res.body).toHaveProperty('expenses');
      expect(res.body.profit).toBe(res.body.income - res.body.expenses);
    });

    it('dashboard profit reflects expenses (profit = revenue - expenses)', async () => {
      const res = await request(http).get('/api/v1/dashboard/branch').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.kpis).toHaveProperty('expenses');
      expect(res.body.kpis.monthlyProfit).toBe(res.body.kpis.revenue - res.body.kpis.expenses);
    });

    it('payroll: create -> approve -> pay (records a salary expense)', async () => {
      const create = await request(http)
        .post('/api/v1/payroll')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ staffUserId, periodStart: '2026-07-01', periodEnd: '2026-07-31', baseAmount: 3000000, bonus: 200000, deduction: 100000 });
      expect(create.status).toBe(201);
      expect(create.body.netAmount).toBe(3100000);
      const id = create.body.id;

      const approve = await request(http).post(`/api/v1/payroll/${id}/approve`).set('Authorization', `Bearer ${managerToken}`);
      expect(approve.status).toBe(201);
      expect(approve.body.status).toBe('approved');

      const pay = await request(http).post(`/api/v1/payroll/${id}/pay`).set('Authorization', `Bearer ${managerToken}`);
      expect(pay.status).toBe(201);
      expect(pay.body.status).toBe('paid');

      // A salary expense should now exist.
      const expenses = await request(http).get('/api/v1/expenses?category=salary').set('Authorization', `Bearer ${managerToken}`);
      expect(expenses.body.length).toBeGreaterThanOrEqual(1);
    });

    it('payroll is forbidden for a receptionist (403)', async () => {
      const res = await request(http).get('/api/v1/payroll').set('Authorization', `Bearer ${recToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ------------------------- Reports & exports -------------------------

  describe('reports', () => {
    let ownerToken: string;
    let managerToken: string;
    let recToken: string;

    beforeAll(async () => {
      ownerToken = (await login('owner@fitnessworld.in', 'Owner@123')).body.accessToken;
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
    });

    it('profit report returns metric rows', async () => {
      const res = await request(http).get('/api/v1/reports/profit').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.columns).toEqual(['Metric', 'Amount (₹)']);
      expect(res.body.rows.length).toBe(3);
    });

    it('branch-comparison is owner-only', async () => {
      const ok = await request(http).get('/api/v1/reports/branch-comparison').set('Authorization', `Bearer ${ownerToken}`);
      expect(ok.status).toBe(200);
      expect(ok.body.rows.length).toBeGreaterThanOrEqual(4);
      const bad = await request(http).get('/api/v1/reports/branch-comparison').set('Authorization', `Bearer ${managerToken}`);
      expect(bad.status).toBe(400);
    });

    it('reports are forbidden for a receptionist (403)', async () => {
      const res = await request(http).get('/api/v1/reports/revenue').set('Authorization', `Bearer ${recToken}`);
      expect(res.status).toBe(403);
    });

    it('CSV export sets text/csv and a filename', async () => {
      const res = await request(http)
        .get('/api/v1/reports/payments/export?format=csv')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text.split('\n')[0]).toContain('Amount');
    });

    it('XLSX export returns a spreadsheet attachment', async () => {
      const res = await request(http)
        .get('/api/v1/reports/revenue/export?format=xlsx')
        .set('Authorization', `Bearer ${managerToken}`)
        .buffer(true);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('.xlsx');
    });
  });

  // ------------------------- Notifications -------------------------

  describe('notifications', () => {
    let ownerToken: string;
    let managerToken: string;
    let recToken: string;

    beforeAll(async () => {
      ownerToken = (await login('owner@fitnessworld.in', 'Owner@123')).body.accessToken;
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
    });

    it('owner broadcasts an announcement to a branch', async () => {
      const res = await request(http)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Holiday hours', body: 'We close at 8pm this week', branchId: undefined });
      expect(res.status).toBe(201);
      expect(res.body.sent).toBeGreaterThanOrEqual(1);
    });

    it('receptionist cannot broadcast (403)', async () => {
      const res = await request(http)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${recToken}`)
        .send({ title: 'nope' });
      expect(res.status).toBe(403);
    });

    it('a recipient sees the notification and unread count', async () => {
      const list = await request(http).get('/api/v1/notifications').set('Authorization', `Bearer ${managerToken}`);
      expect(list.status).toBe(200);
      expect(list.body.length).toBeGreaterThanOrEqual(1);

      const count = await request(http).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${managerToken}`);
      expect(count.body.count).toBeGreaterThanOrEqual(1);
    });

    it('marking read decrements the unread count', async () => {
      const before = (await request(http).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${managerToken}`)).body.count;
      const list = await request(http).get('/api/v1/notifications?unread=true').set('Authorization', `Bearer ${managerToken}`);
      const id = list.body[0].id;
      const read = await request(http).post(`/api/v1/notifications/${id}/read`).set('Authorization', `Bearer ${managerToken}`);
      expect(read.body.updated).toBe(1);
      const after = (await request(http).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${managerToken}`)).body.count;
      expect(after).toBe(before - 1);
    });

    it('a user cannot mark another user\u2019s notification (0 updated)', async () => {
      const list = await request(http).get('/api/v1/notifications').set('Authorization', `Bearer ${managerToken}`);
      const id = list.body[0].id;
      const res = await request(http).post(`/api/v1/notifications/${id}/read`).set('Authorization', `Bearer ${recToken}`);
      expect(res.body.updated).toBe(0);
    });

    it('updates a notification preference', async () => {
      const res = await request(http)
        .patch('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ type: 'payment_due', channel: 'email', enabled: false });
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });
  });

  // ------------------------- Scheduled reminders -------------------------

  describe('reminders', () => {
    let managerToken: string;
    let recToken: string;

    beforeAll(async () => {
      managerToken = (await login('manager.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
      recToken = (await login('reception.kochi@fitnessworld.in', 'Staff@123')).body.accessToken;
    });

    it('manager runs the reminder sweep and it creates digest notifications', async () => {
      // Seeded member KCH-0001 has an unpaid invoice -> a payment_due digest is expected.
      const run = await request(http).post('/api/v1/reminders/run').set('Authorization', `Bearer ${managerToken}`);
      expect(run.status).toBe(200);
      expect(run.body.created).toBeGreaterThanOrEqual(1);

      const notifs = await request(http).get('/api/v1/notifications').set('Authorization', `Bearer ${managerToken}`);
      const hasDigest = notifs.body.some((n: any) => n.type === 'payment_due' || n.type === 'membership_expiry');
      expect(hasDigest).toBe(true);
    });

    it('is idempotent within the same day (second run creates 0)', async () => {
      const again = await request(http).post('/api/v1/reminders/run').set('Authorization', `Bearer ${managerToken}`);
      expect(again.status).toBe(200);
      expect(again.body.created).toBe(0);
    });

    it('receptionist cannot trigger the sweep (403)', async () => {
      const res = await request(http).post('/api/v1/reminders/run').set('Authorization', `Bearer ${recToken}`);
      expect(res.status).toBe(403);
    });
  });
});

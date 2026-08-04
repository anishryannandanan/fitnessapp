/* eslint-disable no-console */
import {
  PrismaClient,
  UserRole,
  StaffType,
  Gender,
  PackageType,
  MembershipStatus,
  PaymentMethod,
  PaymentStatus,
  AttendanceMethod,
  ExpenseCategory,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DAY = 86_400_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function dateAt(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

let invoiceCounter = 100;
function nextInvoiceNumber(branchCode: string): string {
  invoiceCounter++;
  return `INV-${branchCode}-${String(invoiceCounter).padStart(6, '0')}`;
}


// ─── Static data ──────────────────────────────────────────────────────────────

const STAFF_PER_BRANCH: Array<{
  email: string;
  fullName: string;
  role: UserRole;
  staffType: StaffType;
  color: string;
  branchCode: string;
}> = [
  // KTM
  { email: 'manager.ktm@fitnessworld.in', fullName: 'Priya Sharma', role: UserRole.manager, staffType: StaffType.manager, color: '#2563EB', branchCode: 'KTM' },
  { email: 'trainer.ktm@fitnessworld.in', fullName: 'Arjun Pillai', role: UserRole.trainer, staffType: StaffType.trainer, color: '#7C3AED', branchCode: 'KTM' },
  { email: 'reception.ktm@fitnessworld.in', fullName: 'Divya Menon', role: UserRole.receptionist, staffType: StaffType.receptionist, color: '#F59E0B', branchCode: 'KTM' },
  // EKM
  { email: 'manager.ekm@fitnessworld.in', fullName: 'Suresh Kumar', role: UserRole.manager, staffType: StaffType.manager, color: '#059669', branchCode: 'EKM' },
  { email: 'trainer.ekm@fitnessworld.in', fullName: 'Rahul Nair', role: UserRole.trainer, staffType: StaffType.trainer, color: '#DC2626', branchCode: 'EKM' },
  { email: 'reception.ekm@fitnessworld.in', fullName: 'Lakshmi Prasad', role: UserRole.receptionist, staffType: StaffType.receptionist, color: '#D97706', branchCode: 'EKM' },
  // TVM
  { email: 'manager.tvm@fitnessworld.in', fullName: 'Anoop George', role: UserRole.manager, staffType: StaffType.manager, color: '#0891B2', branchCode: 'TVM' },
  { email: 'trainer.tvm@fitnessworld.in', fullName: 'Deepak Varma', role: UserRole.trainer, staffType: StaffType.trainer, color: '#9333EA', branchCode: 'TVM' },
  { email: 'reception.tvm@fitnessworld.in', fullName: 'Sneha Rajan', role: UserRole.receptionist, staffType: StaffType.receptionist, color: '#E11D48', branchCode: 'TVM' },
];

const MEMBER_SEEDS: Array<{
  fullName: string;
  gender: Gender;
  phone: string;
  email?: string;
  branchCode: string;
  dob: string; // ISO date
}> = [
  // KCH (6 members + existing Fathima = 7 total)
  { fullName: 'Anil Kumar', gender: Gender.male, phone: '+919000000010', branchCode: 'KCH', dob: '1990-03-15' },
  { fullName: 'Reshma Mohan', gender: Gender.female, phone: '+919000000011', branchCode: 'KCH', dob: '1995-07-22' },
  { fullName: 'Sanjay Raj', gender: Gender.male, phone: '+919000000012', branchCode: 'KCH', dob: '1988-11-08' },
  { fullName: 'Neethu Joseph', gender: Gender.female, phone: '+919000000013', branchCode: 'KCH', dob: '1992-01-30' },
  { fullName: 'Vivek Menon', gender: Gender.male, phone: '+919000000014', branchCode: 'KCH', dob: '1985-06-12' },
  { fullName: 'Amitha Balan', gender: Gender.female, phone: '+919000000015', branchCode: 'KCH', dob: '1997-09-05' },
  // KTM (6 members)
  { fullName: 'Karthik Ravi', gender: Gender.male, phone: '+919000000020', branchCode: 'KTM', dob: '1991-04-18' },
  { fullName: 'Swathi Nair', gender: Gender.female, phone: '+919000000021', branchCode: 'KTM', dob: '1993-12-25' },
  { fullName: 'Manoj Krishnan', gender: Gender.male, phone: '+919000000022', branchCode: 'KTM', dob: '1987-08-14' },
  { fullName: 'Pooja Suresh', gender: Gender.female, phone: '+919000000023', branchCode: 'KTM', dob: '1996-02-28' },
  { fullName: 'Ajith Varghese', gender: Gender.male, phone: '+919000000024', branchCode: 'KTM', dob: '1989-10-03' },
  { fullName: 'Revathi Menon', gender: Gender.female, phone: '+919000000025', branchCode: 'KTM', dob: '1994-05-19' },
  // EKM (6 members)
  { fullName: 'Vineeth Thomas', gender: Gender.male, phone: '+919000000030', branchCode: 'EKM', dob: '1990-07-07' },
  { fullName: 'Anjali Krishnan', gender: Gender.female, phone: '+919000000031', branchCode: 'EKM', dob: '1992-11-11' },
  { fullName: 'Rajesh Pillai', gender: Gender.male, phone: '+919000000032', branchCode: 'EKM', dob: '1986-03-20' },
  { fullName: 'Meena Gopal', gender: Gender.female, phone: '+919000000033', branchCode: 'EKM', dob: '1995-08-16' },
  { fullName: 'Sunil Chandran', gender: Gender.male, phone: '+919000000034', branchCode: 'EKM', dob: '1988-01-09' },
  { fullName: 'Saranya Das', gender: Gender.female, phone: '+919000000035', branchCode: 'EKM', dob: '1993-06-30' },
  // TVM (6 members)
  { fullName: 'Arun Babu', gender: Gender.male, phone: '+919000000040', branchCode: 'TVM', dob: '1991-09-21' },
  { fullName: 'Gayathri Nair', gender: Gender.female, phone: '+919000000041', branchCode: 'TVM', dob: '1994-04-14' },
  { fullName: 'Jithin Mohan', gender: Gender.male, phone: '+919000000042', branchCode: 'TVM', dob: '1987-12-01' },
  { fullName: 'Kavitha Raj', gender: Gender.female, phone: '+919000000043', branchCode: 'TVM', dob: '1996-07-25' },
  { fullName: 'Prasanth Kumar', gender: Gender.male, phone: '+919000000044', branchCode: 'TVM', dob: '1989-02-10' },
  { fullName: 'Sreelakshmi Pillai', gender: Gender.female, phone: '+919000000045', branchCode: 'TVM', dob: '1993-10-08' },
];


// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDemoData() {
  console.log('Seeding demo data for realistic gym dashboard...');

  // ─── Lookup existing entities ───────────────────────────────────────────────
  const business = await prisma.business.findFirstOrThrow();
  const branches = await prisma.branch.findMany({ where: { businessId: business.id } });
  const branchMap = new Map(branches.map((b) => [b.code, b]));

  const kochi = branchMap.get('KCH')!;
  const staffHash = await bcrypt.hash('Staff@123', 10);

  // ─── 1. Staff at other branches ────────────────────────────────────────────
  console.log('  [1/12] Creating staff...');
  for (const s of STAFF_PER_BRANCH) {
    const branch = branchMap.get(s.branchCode)!;
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (existing) continue;

    const user = await prisma.user.create({
      data: {
        businessId: business.id,
        role: s.role,
        email: s.email,
        fullName: s.fullName,
        avatarColor: s.color,
        passwordHash: staffHash,
      },
    });
    await prisma.userBranch.create({
      data: { userId: user.id, branchId: branch.id, isPrimary: true },
    });
    await prisma.staffProfile.create({
      data: { userId: user.id, branchId: branch.id, staffType: s.staffType },
    });
  }

  // ─── 2. Packages (ensure we have packages available) ──────────────────────
  console.log('  [2/12] Ensuring packages...');
  const pkgSeeds = [
    { name: 'Gym Only - Monthly', type: PackageType.non_trainer, durationDays: 30, price: 150000 },
    { name: 'Gym Only - Annual', type: PackageType.non_trainer, durationDays: 365, price: 1200000 },
    { name: 'Cardio Only - Monthly', type: PackageType.non_trainer, durationDays: 30, price: 120000 },
    { name: 'Personal Training - Monthly', type: PackageType.trainer, durationDays: 30, price: 500000, ptSessions: 12, includesTrainer: true },
  ];
  const packages: Array<{ id: string; name: string; price: number; durationDays: number; type: PackageType; ptSessions: number | null }> = [];
  for (const p of pkgSeeds) {
    const existing = await prisma.package.findFirst({ where: { businessId: business.id, name: p.name } });
    if (existing) {
      packages.push({ id: existing.id, name: existing.name, price: existing.price, durationDays: existing.durationDays, type: existing.type, ptSessions: existing.ptSessions });
    } else {
      const pkg = await prisma.package.create({
        data: { businessId: business.id, name: p.name, type: p.type, durationDays: p.durationDays, price: p.price, ptSessions: p.ptSessions ?? null, includesTrainer: p.includesTrainer ?? false },
      });
      packages.push({ id: pkg.id, name: pkg.name, price: pkg.price, durationDays: pkg.durationDays, type: pkg.type, ptSessions: pkg.ptSessions });
    }
  }

  // ─── 3. Members ────────────────────────────────────────────────────────────
  console.log('  [3/12] Creating members...');
  interface MemberRecord { id: string; fullName: string; branchId: string; branchCode: string }
  const createdMembers: MemberRecord[] = [];
  let memberSeq = 1;

  for (const m of MEMBER_SEEDS) {
    const branch = branchMap.get(m.branchCode)!;
    const code = `${m.branchCode}-${String(memberSeq++).padStart(4, '0')}`;

    const existing = await prisma.member.findFirst({ where: { homeBranchId: branch.id, phone: m.phone } });
    if (existing) {
      createdMembers.push({ id: existing.id, fullName: existing.fullName, branchId: branch.id, branchCode: m.branchCode });
      continue;
    }

    const member = await prisma.member.create({
      data: {
        businessId: business.id,
        homeBranchId: branch.id,
        memberCode: code,
        fullName: m.fullName,
        gender: m.gender,
        phone: m.phone,
        email: m.email,
        dob: new Date(m.dob),
      },
    });
    createdMembers.push({ id: member.id, fullName: member.fullName, branchId: branch.id, branchCode: m.branchCode });
  }

  // Also include Fathima (existing member from main seed)
  const fathima = await prisma.member.findFirst({ where: { memberCode: 'KCH-0001' } });
  if (fathima) {
    createdMembers.push({ id: fathima.id, fullName: fathima.fullName, branchId: kochi.id, branchCode: 'KCH' });
  }


  // ─── 4. Memberships + 5. Invoices + Payments ──────────────────────────────
  console.log('  [4/12] Creating memberships, invoices, payments...');
  const paymentMethods: PaymentMethod[] = [PaymentMethod.cash, PaymentMethod.upi, PaymentMethod.card, PaymentMethod.bank_transfer];

  for (let idx = 0; idx < createdMembers.length; idx++) {
    const m = createdMembers[idx];
    // Check if member already has an active membership (skip if so)
    const existingMs = await prisma.membership.findFirst({ where: { memberId: m.id, status: MembershipStatus.active } });
    if (existingMs) continue;

    // Assign a random package
    const pkg = packages[idx % packages.length];
    const startDaysAgo = randomInt(10, 80);
    const startDate = daysAgo(startDaysAgo);
    const endDate = new Date(startDate.getTime() + pkg.durationDays * DAY);

    const membership = await prisma.membership.create({
      data: {
        memberId: m.id,
        branchId: m.branchId,
        packageId: pkg.id,
        startDate,
        endDate,
        priceSnapshot: pkg.price,
        status: MembershipStatus.active,
        sessionsTotal: pkg.ptSessions,
      },
    });

    // Invoice — decide status
    const roll = idx % 5; // 0,1,2 = paid (60%), 3 = partial (20%), 4 = overdue (20%)
    let invoiceStatus: 'paid' | 'partially_paid' | 'overdue';
    let amountPaid: number;
    if (roll <= 2) {
      invoiceStatus = 'paid';
      amountPaid = pkg.price;
    } else if (roll === 3) {
      invoiceStatus = 'partially_paid';
      amountPaid = Math.round(pkg.price * 0.5);
    } else {
      invoiceStatus = 'overdue';
      amountPaid = 0;
    }

    const branchCode = m.branchCode;
    const invoice = await prisma.invoice.create({
      data: {
        branchId: m.branchId,
        memberId: m.id,
        membershipId: membership.id,
        invoiceNumber: nextInvoiceNumber(branchCode),
        subtotal: pkg.price,
        tax: 0,
        total: pkg.price,
        amountPaid,
        status: invoiceStatus,
        dueDate: invoiceStatus === 'overdue' ? daysAgo(randomInt(5, 20)) : null,
      },
    });

    // Payments (only if amountPaid > 0)
    if (amountPaid > 0) {
      // Split into 1-3 payments spread over past days
      const numPayments = amountPaid === pkg.price ? randomInt(1, 2) : 1;
      const perPayment = Math.floor(amountPaid / numPayments);
      for (let pi = 0; pi < numPayments; pi++) {
        const payAmount = pi === numPayments - 1 ? amountPaid - perPayment * (numPayments - 1) : perPayment;
        await prisma.payment.create({
          data: {
            branchId: m.branchId,
            invoiceId: invoice.id,
            memberId: m.id,
            amount: payAmount,
            method: randomPick(paymentMethods),
            status: PaymentStatus.paid,
            paidAt: daysAgo(randomInt(1, startDaysAgo)),
          },
        });
      }
    }
  }


  // ─── 6. Attendance Logs (30 days) ─────────────────────────────────────────
  console.log('  [5/12] Creating attendance logs...');
  const attendanceMethods: AttendanceMethod[] = [AttendanceMethod.qr, AttendanceMethod.manual];
  // Morning slots: 5:30-9:00, Evening slots: 16:00-21:00
  const timeSlots = [
    { h: 5, m: 30 }, { h: 6, m: 0 }, { h: 6, m: 30 }, { h: 7, m: 0 },
    { h: 7, m: 30 }, { h: 8, m: 0 }, { h: 8, m: 30 },
    { h: 16, m: 0 }, { h: 16, m: 30 }, { h: 17, m: 0 }, { h: 17, m: 30 },
    { h: 18, m: 0 }, { h: 18, m: 30 }, { h: 19, m: 0 }, { h: 19, m: 30 },
    { h: 20, m: 0 }, { h: 20, m: 30 },
  ];

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const day = daysAgo(dayOffset);
    const dow = day.getDay(); // 0=Sun
    if (dow === 0) continue; // closed on Sundays

    for (const member of createdMembers) {
      // Each member attends 3-5 times per week => ~60-70% probability per day
      if (Math.random() > 0.65) continue;

      const slot = randomPick(timeSlots);
      const checkIn = dateAt(day, slot.h, slot.m);
      const durationMin = randomInt(45, 90);
      const checkOut = new Date(checkIn.getTime() + durationMin * 60_000);

      await prisma.attendanceLog.create({
        data: {
          branchId: member.branchId,
          memberId: member.id,
          method: randomPick(attendanceMethods),
          checkInAt: checkIn,
          checkOutAt: checkOut,
          durationMinutes: durationMin,
        },
      });
    }
  }


  // ─── 7. Expenses (3 months) ───────────────────────────────────────────────
  console.log('  [6/12] Creating expenses...');
  const monthlyExpenses: Array<{ category: ExpenseCategory; amount: number; vendor: string }> = [
    { category: ExpenseCategory.rent, amount: 7500000, vendor: 'Property Owner' },
    { category: ExpenseCategory.electricity, amount: 1800000, vendor: 'KSEB' },
    { category: ExpenseCategory.internet, amount: 250000, vendor: 'Jio Fiber' },
    { category: ExpenseCategory.salary, amount: 12000000, vendor: 'Payroll' },
    { category: ExpenseCategory.cleaning, amount: 350000, vendor: 'CleanPro Services' },
  ];

  for (const branch of branches) {
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const expenseDate = daysAgo(monthOffset * 30 + randomInt(1, 5));
      for (const exp of monthlyExpenses) {
        // Vary amount slightly per branch/month
        const variance = Math.round(exp.amount * (0.9 + Math.random() * 0.2));
        await prisma.expense.create({
          data: {
            branchId: branch.id,
            category: exp.category,
            amount: variance,
            expenseDate,
            vendor: exp.vendor,
            note: `${exp.category} for ${branch.name}`,
          },
        });
      }

      // Random one-off expenses
      if (Math.random() > 0.5) {
        await prisma.expense.create({
          data: {
            branchId: branch.id,
            category: ExpenseCategory.equipment,
            amount: randomInt(500000, 3000000),
            expenseDate: daysAgo(monthOffset * 30 + randomInt(10, 25)),
            vendor: 'GymEquip India',
            note: 'Equipment purchase/replacement',
          },
        });
      }
      if (Math.random() > 0.6) {
        await prisma.expense.create({
          data: {
            branchId: branch.id,
            category: ExpenseCategory.repairs,
            amount: randomInt(200000, 800000),
            expenseDate: daysAgo(monthOffset * 30 + randomInt(5, 20)),
            vendor: 'Local Repair Service',
            note: 'Maintenance/repairs',
          },
        });
      }
      if (Math.random() > 0.7) {
        await prisma.expense.create({
          data: {
            branchId: branch.id,
            category: ExpenseCategory.marketing,
            amount: randomInt(100000, 500000),
            expenseDate: daysAgo(monthOffset * 30 + randomInt(1, 28)),
            vendor: 'Digital Marketing Agency',
            note: 'Social media ads',
          },
        });
      }
    }
  }


  // ─── 8. Measurements for Fathima ─────────────────────────────────────────
  console.log('  [7/12] Creating measurements for Fathima...');
  if (fathima) {
    const existingMeasurements = await prisma.measurement.findFirst({ where: { memberId: fathima.id } });
    if (!existingMeasurements) {
      const weights = [72000, 71200, 70500, 69800, 69000, 68000]; // grams
      const bodyFats = [28.0, 27.5, 27.0, 26.2, 25.5, 25.0];
      const muscles = [32.0, 32.3, 32.5, 32.8, 33.0, 33.3];
      const waists = [82.0, 81.5, 81.0, 80.2, 79.5, 79.0];

      for (let week = 0; week < 6; week++) {
        await prisma.measurement.create({
          data: {
            memberId: fathima.id,
            recordedAt: daysAgo((5 - week) * 7),
            weightG: weights[week],
            bodyFatPct: bodyFats[week],
            musclePct: muscles[week],
            waistCm: waists[week],
            chestCm: 88.0 - week * 0.3,
            hipsCm: 96.0 - week * 0.4,
            armsCm: 28.5 + week * 0.2,
            thighsCm: 56.0 - week * 0.2,
            note: `Week ${week + 1} progress check`,
          },
        });
      }
    }
  }

  // ─── 9. Workout Logs for Fathima ──────────────────────────────────────────
  console.log('  [8/12] Creating workout logs for Fathima...');
  if (fathima) {
    const existingLogs = await prisma.workoutLog.findFirst({ where: { memberId: fathima.id } });
    if (!existingLogs) {
      // Get exercises
      const benchPress = await prisma.exercise.findFirst({ where: { businessId: business.id, name: 'Bench Press' } });
      const squat = await prisma.exercise.findFirst({ where: { businessId: business.id, name: 'Squat' } });
      const latPulldown = await prisma.exercise.findFirst({ where: { businessId: business.id, name: 'Lat Pulldown' } });
      const workoutPlan = await prisma.workoutPlan.findFirst({ where: { memberId: fathima.id } });

      if (benchPress && squat && latPulldown) {
        // 18 workout sessions over last 30 days (roughly every other day)
        for (let i = 0; i < 18; i++) {
          const dayOffset = Math.floor(i * 1.7); // spread across ~30 days
          const performedAt = dateAt(daysAgo(30 - dayOffset), randomInt(6, 18), randomInt(0, 59));

          const log = await prisma.workoutLog.create({
            data: {
              memberId: fathima.id,
              planId: workoutPlan?.id ?? null,
              performedAt,
              durationMinutes: randomInt(50, 75),
              rating: randomInt(3, 5),
              notes: i % 3 === 0 ? 'Felt strong today' : i % 3 === 1 ? 'Good session' : null,
            },
          });

          // Progressive overload: weight increases over sessions
          const baseWeight = 20000; // 20kg in grams
          const progression = i * 500; // +500g each session

          // Bench Press sets
          for (let s = 0; s < 3; s++) {
            await prisma.workoutLogSet.create({
              data: {
                workoutLogId: log.id,
                exerciseId: benchPress.id,
                setIndex: s,
                weightGrams: baseWeight + progression,
                reps: randomInt(8, 12),
                isPr: i === 17 && s === 0,
                completed: true,
              },
            });
          }

          // Squat sets
          for (let s = 0; s < 3; s++) {
            await prisma.workoutLogSet.create({
              data: {
                workoutLogId: log.id,
                exerciseId: squat.id,
                setIndex: s,
                weightGrams: 30000 + progression,
                reps: randomInt(8, 10),
                isPr: i === 17 && s === 0,
                completed: true,
              },
            });
          }

          // Lat Pulldown sets
          for (let s = 0; s < 3; s++) {
            await prisma.workoutLogSet.create({
              data: {
                workoutLogId: log.id,
                exerciseId: latPulldown.id,
                setIndex: s,
                weightGrams: 25000 + Math.floor(progression * 0.8),
                reps: randomInt(10, 12),
                isPr: false,
                completed: s < 2 || Math.random() > 0.2,
              },
            });
          }
        }
      }
    }
  }


  // ─── 10. Group Classes ────────────────────────────────────────────────────
  console.log('  [9/12] Creating group classes...');
  const trainer = await prisma.user.findUnique({ where: { email: 'vishnu@fitnessworld.in' } });
  if (trainer) {
    const classSeeds = [
      { name: 'Morning Yoga', dayOfWeek: 1, startTime: '06:00', endTime: '07:00', classType: 'yoga', maxCapacity: 15 },
      { name: 'HIIT', dayOfWeek: 2, startTime: '07:00', endTime: '07:45', classType: 'hiit', maxCapacity: 12 },
      { name: 'Cardio Blast', dayOfWeek: 3, startTime: '17:00', endTime: '18:00', classType: 'cardio', maxCapacity: 20 },
      { name: 'Strength Hour', dayOfWeek: 5, startTime: '18:00', endTime: '19:00', classType: 'strength', maxCapacity: 10 },
    ];

    for (const cls of classSeeds) {
      const existing = await prisma.groupClass.findFirst({
        where: { branchId: kochi.id, name: cls.name },
      });
      if (existing) continue;

      const groupClass = await prisma.groupClass.create({
        data: {
          branchId: kochi.id,
          coachId: trainer.id,
          name: cls.name,
          dayOfWeek: cls.dayOfWeek,
          startTime: cls.startTime,
          endTime: cls.endTime,
          classType: cls.classType,
          maxCapacity: cls.maxCapacity,
          isRecurring: true,
          isActive: true,
        },
      });

      // Enroll some Kochi members
      const kochiMembers = createdMembers.filter((m) => m.branchCode === 'KCH');
      const enrollCount = randomInt(3, Math.min(6, kochiMembers.length));
      for (let i = 0; i < enrollCount; i++) {
        await prisma.classEnrollment.create({
          data: { classId: groupClass.id, memberId: kochiMembers[i].id },
        }).catch(() => {}); // ignore unique constraint if already enrolled
      }
    }
  }

  // ─── 11. Trainer Slots ────────────────────────────────────────────────────
  console.log('  [10/12] Creating trainer slots...');
  if (trainer) {
    const existingSlots = await prisma.trainerSlot.findFirst({ where: { trainerId: trainer.id } });
    if (!existingSlots) {
      // Mon-Sat (1-6), morning 6-8, evening 4-7
      for (let day = 1; day <= 6; day++) {
        // Morning block: 6:00-8:00 (2 one-hour slots)
        await prisma.trainerSlot.create({
          data: { branchId: kochi.id, trainerId: trainer.id, dayOfWeek: day, startTime: '06:00', endTime: '07:00', maxClients: 1, isActive: true },
        });
        await prisma.trainerSlot.create({
          data: { branchId: kochi.id, trainerId: trainer.id, dayOfWeek: day, startTime: '07:00', endTime: '08:00', maxClients: 1, isActive: true },
        });
        // Evening block: 4:00-7:00 (3 one-hour slots)
        await prisma.trainerSlot.create({
          data: { branchId: kochi.id, trainerId: trainer.id, dayOfWeek: day, startTime: '16:00', endTime: '17:00', maxClients: 1, isActive: true },
        });
        await prisma.trainerSlot.create({
          data: { branchId: kochi.id, trainerId: trainer.id, dayOfWeek: day, startTime: '17:00', endTime: '18:00', maxClients: 1, isActive: true },
        });
        await prisma.trainerSlot.create({
          data: { branchId: kochi.id, trainerId: trainer.id, dayOfWeek: day, startTime: '18:00', endTime: '19:00', maxClients: 1, isActive: true },
        });
      }
    }
  }


  // ─── 12. PT Sessions ─────────────────────────────────────────────────────
  console.log('  [11/12] Creating PT sessions...');
  if (trainer && fathima) {
    const existingSessions = await prisma.pTSession.findFirst({ where: { trainerId: trainer.id, memberId: fathima.id } });
    if (!existingSessions) {
      // Get a slot for reference
      const morningSlot = await prisma.trainerSlot.findFirst({
        where: { trainerId: trainer.id, startTime: '07:00' },
      });

      // 5 completed sessions in the past
      for (let i = 0; i < 5; i++) {
        const scheduledDate = daysAgo(randomInt(5, 25));
        await prisma.pTSession.create({
          data: {
            branchId: kochi.id,
            trainerId: trainer.id,
            memberId: fathima.id,
            slotId: morningSlot?.id ?? null,
            scheduledDate,
            startTime: '07:00',
            endTime: '08:00',
            status: 'completed',
            notes: `Session ${i + 1} - ${['Upper body', 'Lower body', 'Full body', 'Core + cardio', 'Strength'][i]}`,
          },
        });
      }

      // 2 no-show
      await prisma.pTSession.create({
        data: {
          branchId: kochi.id,
          trainerId: trainer.id,
          memberId: fathima.id,
          slotId: morningSlot?.id ?? null,
          scheduledDate: daysAgo(3),
          startTime: '07:00',
          endTime: '08:00',
          status: 'no_show',
          notes: 'Member did not show up',
        },
      });

      // 3 scheduled in the future
      for (let i = 0; i < 3; i++) {
        const futureDate = new Date(Date.now() + (i + 1) * 2 * DAY);
        await prisma.pTSession.create({
          data: {
            branchId: kochi.id,
            trainerId: trainer.id,
            memberId: fathima.id,
            slotId: morningSlot?.id ?? null,
            scheduledDate: futureDate,
            startTime: '07:00',
            endTime: '08:00',
            status: 'scheduled',
            notes: `Upcoming session ${i + 1}`,
          },
        });
      }
    }
  }

  // ─── Additional Payments to fill revenue dashboard ────────────────────────
  console.log('  [12/12] Adding supplementary payments for revenue...');
  // Ensure each branch has realistic monthly revenue (3-5 lakh)
  for (const branch of branches) {
    const branchMembers = createdMembers.filter((m) => m.branchId === branch.id);
    if (branchMembers.length === 0) continue;

    // Add walk-in / extra payments spread over 90 days
    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      // 1-3 small payments per day (personal training sessions, etc.)
      const numExtra = randomInt(1, 3);
      for (let p = 0; p < numExtra; p++) {
        const member = randomPick(branchMembers);
        await prisma.payment.create({
          data: {
            branchId: branch.id,
            memberId: member.id,
            amount: randomInt(30000, 150000), // 300-1500 rupees
            method: randomPick(paymentMethods),
            status: PaymentStatus.paid,
            paidAt: daysAgo(dayOffset),
            notes: randomPick(['PT session', 'Locker rental', 'Supplement purchase', 'Guest pass', 'Extra class']),
          },
        });
      }
    }
  }

  console.log('Demo data seeded successfully!');
  console.log(`  Members: ${createdMembers.length}`);
  console.log(`  Branches with data: ${branches.length}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (require.main === module) {
  seedDemoData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


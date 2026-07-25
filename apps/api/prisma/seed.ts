/* eslint-disable no-console */
import { PrismaClient, UserRole, StaffType, PackageType, MembershipStatus, Difficulty } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@fitnessworld.in';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'Owner@123';
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Staff@123';

const BRANCHES = [
  { name: 'Kochi', code: 'KCH' },
  { name: 'Kottayam', code: 'KTM' },
  { name: 'Ernakulam', code: 'EKM' },
  { name: 'Trivandrum', code: 'TVM' },
];

async function main() {
  console.log('Seeding FitCore (single business + branches + demo users)...');

  // 1) The single business
  const existing = await prisma.business.findFirst();
  const business =
    existing ??
    (await prisma.business.create({
      data: { name: 'Fitness World', currency: 'INR', timezone: 'Asia/Kolkata' },
    }));

  // 2) Branches (idempotent by businessId + code)
  const branches = [];
  for (const b of BRANCHES) {
    const branch = await prisma.branch.upsert({
      where: { businessId_code: { businessId: business.id, code: b.code } },
      update: {},
      create: { businessId: business.id, name: b.name, code: b.code },
    });
    branches.push(branch);
  }
  const kochi = branches[0];

  const ownerHash = await bcrypt.hash(OWNER_PASSWORD, 10);
  const staffHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 3) Owner (no branch assignment => all branches)
  await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      businessId: business.id,
      role: UserRole.owner,
      email: OWNER_EMAIL,
      fullName: 'Rajan Menon',
      avatarColor: '#16A34A',
      passwordHash: ownerHash,
    },
  });

  // 4) One user per role at the Kochi branch
  const staff: Array<{
    email: string;
    fullName: string;
    role: UserRole;
    staffType?: StaffType;
    color: string;
  }> = [
    { email: 'manager.kochi@fitnessworld.in', fullName: 'Meera Nair', role: UserRole.manager, staffType: StaffType.manager, color: '#3B82F6' },
    { email: 'reception.kochi@fitnessworld.in', fullName: 'Anu Thomas', role: UserRole.receptionist, staffType: StaffType.receptionist, color: '#F97316' },
    { email: 'vishnu@fitnessworld.in', fullName: 'Vishnu R', role: UserRole.trainer, staffType: StaffType.trainer, color: '#A855F7' },
  ];

  for (const s of staff) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        businessId: business.id,
        role: s.role,
        email: s.email,
        fullName: s.fullName,
        avatarColor: s.color,
        passwordHash: staffHash,
      },
    });

    await prisma.userBranch.upsert({
      where: { userId_branchId: { userId: user.id, branchId: kochi.id } },
      update: {},
      create: { userId: user.id, branchId: kochi.id, isPrimary: true },
    });

    if (s.staffType) {
      await prisma.staffProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, branchId: kochi.id, staffType: s.staffType },
      });
    }
  }

  // 5) A demo member (member role, home branch = Kochi via userBranch)
  const member = await prisma.user.upsert({
    where: { email: 'fathima@example.com' },
    update: {},
    create: {
      businessId: business.id,
      role: UserRole.member,
      email: 'fathima@example.com',
      fullName: 'Fathima S',
      avatarColor: '#EC4899',
      passwordHash: staffHash,
    },
  });
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: member.id, branchId: kochi.id } },
    update: {},
    create: { userId: member.id, branchId: kochi.id, isPrimary: true },
  });

  // 6) Sample packages (all-branch + branch-specific). Idempotent by name.
  const packageSeeds: Array<{
    name: string;
    type: PackageType;
    durationDays: number;
    price: number; // minor units
    ptSessions?: number;
    includesTrainer?: boolean;
    branchId?: string | null;
  }> = [
    { name: 'Gym Only - Monthly', type: PackageType.non_trainer, durationDays: 30, price: 150000, branchId: null },
    { name: 'Gym Only - Annual', type: PackageType.non_trainer, durationDays: 365, price: 1200000, branchId: null },
    { name: 'Cardio Only - Monthly', type: PackageType.non_trainer, durationDays: 30, price: 120000, branchId: null },
    { name: 'Personal Training - Monthly', type: PackageType.trainer, durationDays: 30, price: 500000, ptSessions: 12, includesTrainer: true, branchId: null },
    { name: 'Transformation - Quarterly', type: PackageType.trainer, durationDays: 90, price: 1500000, ptSessions: 36, includesTrainer: true, branchId: kochi.id },
  ];

  const packages = [];
  for (const p of packageSeeds) {
    // No natural unique key on name; find-or-create to stay idempotent.
    const existingPkg = await prisma.package.findFirst({
      where: { businessId: business.id, name: p.name },
    });
    const pkg =
      existingPkg ??
      (await prisma.package.create({
        data: {
          businessId: business.id,
          branchId: p.branchId ?? null,
          name: p.name,
          type: p.type,
          durationDays: p.durationDays,
          price: p.price,
          ptSessions: p.ptSessions ?? null,
          includesTrainer: p.includesTrainer ?? false,
        },
      }));
    packages.push(pkg);
  }

  // 7) A demo member with an active membership at Kochi.
  const gymAnnual = packages.find((p) => p.name === 'Gym Only - Annual')!;
  const existingMember = await prisma.member.findFirst({
    where: { homeBranchId: kochi.id, memberCode: 'KCH-0001' },
  });
  if (!existingMember) {
    const start = new Date();
    const end = new Date(start.getTime() + gymAnnual.durationDays * 24 * 60 * 60 * 1000);
    const newMember = await prisma.member.create({
      data: {
        businessId: business.id,
        homeBranchId: kochi.id,
        memberCode: 'KCH-0001',
        fullName: 'Fathima S',
        phone: '+919000000001',
        email: 'fathima.member@example.com',
        gender: 'female',
        userId: member.id, // link the member record to the member's login account
        memberships: {
          create: {
            branchId: kochi.id,
            packageId: gymAnnual.id,
            startDate: start,
            endDate: end,
            priceSnapshot: gymAnnual.price,
            status: MembershipStatus.active,
          },
        },
      },
      include: { memberships: true },
    });

    // Issue an invoice for the membership (unpaid => appears in outstanding/dues).
    const ms = newMember.memberships[0];
    await prisma.invoice.create({
      data: {
        branchId: kochi.id,
        memberId: newMember.id,
        membershipId: ms.id,
        invoiceNumber: 'INV-KCH-000001',
        subtotal: gymAnnual.price,
        tax: 0,
        total: gymAnnual.price,
        amountPaid: 0,
        status: 'issued',
      },
    });

    // Exercise library + a workout plan & diet plan assigned to the member.
    const trainer = await prisma.user.findUnique({ where: { email: 'vishnu@fitnessworld.in' } });
    const createdById = trainer?.id ?? member.id; // required field; fall back to any user

    const exerciseSeeds = [
      { name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', difficulty: Difficulty.intermediate },
      { name: 'Squat', muscleGroup: 'legs', equipment: 'barbell', difficulty: Difficulty.intermediate },
      { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable', difficulty: Difficulty.beginner },
    ];
    const exercises = [];
    for (const e of exerciseSeeds) {
      const existingEx = await prisma.exercise.findFirst({ where: { businessId: business.id, name: e.name } });
      exercises.push(existingEx ?? (await prisma.exercise.create({ data: { businessId: business.id, ...e } })));
    }

    await prisma.workoutPlan.create({
      data: {
        branchId: kochi.id,
        createdById,
        memberId: newMember.id,
        name: 'Beginner Full Body',
        goal: 'general_fitness',
        weeks: 4,
        daysPerWeek: 3,
        exercises: {
          create: exercises.map((ex, i) => ({
            exerciseId: ex.id,
            dayIndex: 1,
            orderIndex: i,
            sets: 3,
            reps: '10',
            restSec: 60,
          })),
        },
      },
    });

    await prisma.dietPlan.create({
      data: {
        branchId: kochi.id,
        createdById,
        memberId: newMember.id,
        name: 'Balanced 1800',
        dailyCalories: 1800,
        proteinG: 130,
        carbsG: 180,
        fatG: 55,
        waterGoalMl: 3000,
        meals: {
          create: [
            { mealType: 'breakfast', orderIndex: 0, title: 'Oats + Whey + Banana', calories: 420, proteinG: 35 },
            { mealType: 'lunch', orderIndex: 1, title: 'Chicken + Rice + Salad', calories: 620, proteinG: 48 },
            { mealType: 'dinner', orderIndex: 2, title: 'Paneer + Veggies', calories: 540, proteinG: 42 },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log(`  Packages: ${packages.length}`);
  console.log(`  Business: ${business.name}`);
  console.log(`  Branches: ${branches.map((b) => b.code).join(', ')}`);
  console.log(`  Owner login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`  Staff/member login password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

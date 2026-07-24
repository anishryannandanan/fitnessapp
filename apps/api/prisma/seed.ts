/* eslint-disable no-console */
import { PrismaClient, UserRole, StaffType } from '@prisma/client';
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

  console.log('Seed complete.');
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

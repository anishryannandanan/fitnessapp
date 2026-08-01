import { Link } from 'react-router-dom';
import {
  Dumbbell, Shield, Building2, Users, UserCog, CreditCard,
  Salad, LineChart, ArrowLeft, Crown, Briefcase, GraduationCap, User,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card } from '@/components/ui/Card';

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function RoleCard({ icon, title, description }: RoleCardProps) {
  return (
    <Card className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-text">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
    </Card>
  );
}

interface ModuleSectionProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

function ModuleSection({ icon, title, items }: ModuleSectionProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
        <h3 className="font-semibold text-text">{title}</h3>
      </div>
      <ul className="space-y-2 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function Features() {
  return (
    <div className="min-h-dvh bg-background px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Back to Sign In */}
      <div className="mx-auto max-w-3xl">
        <Link
          to="/sign-in"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:opacity-80"
        >
          <ArrowLeft size={16} />
          Back to Sign In
        </Link>

        {/* Header / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-lg">
            <Dumbbell size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text">
              Fit<span className="text-primary">Core</span>
            </h1>
            <p className="text-sm text-muted">Platform Features & Capabilities</p>
          </div>
        </div>

        {/* Section 1: Core User Roles & Permissions */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-text">1. Core User Roles & Permissions</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <RoleCard
              icon={<Crown size={20} />}
              title="Super Admin (Gym Owner)"
              description="Full access to all branches, global financial reports, plan management, and staff administration."
            />
            <RoleCard
              icon={<Briefcase size={20} />}
              title="Branch Manager"
              description="Manages branch-specific operations, member approvals, trainer assignments, and local attendance."
            />
            <RoleCard
              icon={<GraduationCap size={20} />}
              title="Personal Trainer / General Coach"
              description="Views assigned clients, creates/updates workout and diet plans, and logs client fitness metrics."
            />
            <RoleCard
              icon={<User size={20} />}
              title="Gym Member"
              description="Accesses personal dashboard, views subscription status, pays bills online, tracks physical measurements, and accesses diet/workout plans."
            />
          </div>
        </section>

        {/* Section 2: Key Modules & Functional Requirements */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-text">2. Key Modules & Functional Requirements</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ModuleSection
              icon={<Users size={18} />}
              title="A. Multi-Branch & User Management"
              items={[
                'Capability to create, edit, and manage multiple gym locations.',
                'Role-based dashboard views for Owners, Managers, Trainers, and Members.',
                'Seamless onboarding for new members with branch assignment.',
              ]}
            />

            <ModuleSection
              icon={<CreditCard size={18} />}
              title="B. Plans, Subscriptions & Payments"
              items={[
                'Create dynamic membership tiers (e.g., Monthly, Quarterly, Annual, VIP with Personal Training).',
                'Online Payment Integration: Google Pay (GPay) via UPI / Payment Gateway (e.g., Razorpay / Stripe) for automated billing and instant receipt generation.',
                'Auto-reminders for upcoming subscription renewals via SMS/WhatsApp/Email.',
              ]}
            />

            <ModuleSection
              icon={<UserCog size={18} />}
              title="C. Trainer Allocation & Coaching"
              items={[
                'Personal Trainer Path: Assign 1-on-1 personal trainers based on member preference and trainer availability.',
                'General/Group Floor Coach Path: For members who decline personal training, automatically assign them to a branch floor coach or general group training roster.',
              ]}
            />

            <ModuleSection
              icon={<LineChart size={18} />}
              title="D. Fitness Tracking & Body Measurement Analytics"
              items={[
                'Input and track key metrics over time: Weight, BMI, Body Fat %, Muscle Mass, Chest, Waist, Arms, Thighs, and Hip measurements.',
                'Visual progress graphs and historical logs accessible to both the trainer and the member.',
              ]}
            />

            <ModuleSection
              icon={<Salad size={18} />}
              title="E. Diet & Nutrition Planning"
              items={[
                'Customized diet template builder for trainers/coaches (Macro breakdowns: Protein, Carbs, Fats, Calories).',
                'Daily meal schedule assignment (Breakfast, Lunch, Snacks, Dinner) with downloadable PDF summaries for members.',
              ]}
            />
          </div>
        </section>

        {/* Footer CTA */}
        <div className="text-center">
          <Link
            to="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg shadow transition hover:opacity-90"
          >
            <Dumbbell size={16} />
            Get Started
          </Link>
          <p className="mt-3 text-xs text-muted">
            Sign in or explore the demo to experience all features.
          </p>
        </div>
      </div>
    </div>
  );
}

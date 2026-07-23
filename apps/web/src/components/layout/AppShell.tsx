import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

// App shell: sidebar (desktop) + top bar + scrollable content + bottom nav (mobile)
export function AppShell() {
  return (
    <div className="flex h-full min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 md:pb-8">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

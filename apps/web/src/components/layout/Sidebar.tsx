import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  MapPin,
  Car,
  History,
  CloudUpload,
  ChevronsUpDown,
  User,
  ShieldCheck,
  SlidersHorizontal,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { endLocalSession } from '@/services/authSession';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MAIN_MENU = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/start-trip', label: 'Vị trí trực tiếp', Icon: MapPin },
  { to: '/vehicles', label: 'Quản lý phương tiện', Icon: Car },
  { to: '/trip-history', label: 'Lịch sử chuyến đi', Icon: History },
  { to: '/offline-sync', label: 'Offline Sync', Icon: CloudUpload },
] as const;

interface SidebarProps {
  onNavigate?: () => void;
  hideBrand?: boolean;
}

export function Sidebar({ onNavigate, hideBrand = false }: SidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuFitFrame = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuShift, setMenuShift] = useState(0);

  const fitAccountMenu = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - rect.height - 8));
    const correction = top - rect.top;
    if (Math.abs(correction) > 0.5) setMenuShift((current) => current + correction);
  }, []);

  const scheduleMenuFit = useCallback(() => {
    cancelAnimationFrame(menuFitFrame.current);
    menuFitFrame.current = requestAnimationFrame(fitAccountMenu);
  }, [fitAccountMenu]);

  const attachAccountMenu = useCallback((element: HTMLDivElement | null) => {
    menuRef.current = element;
    cancelAnimationFrame(menuFitFrame.current);
    if (element) scheduleMenuFit();
  }, [scheduleMenuFit]);

  useEffect(() => {
    if (!menuOpen) return;
    window.addEventListener('resize', scheduleMenuFit);
    return () => {
      cancelAnimationFrame(menuFitFrame.current);
      window.removeEventListener('resize', scheduleMenuFit);
    };
  }, [menuOpen, scheduleMenuFit]);

  function handleLogout() {
    onNavigate?.();
    endLocalSession();
    navigate('/login', { replace: true });
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'NW';

  return (
    <aside className={cn(
      'flex w-full flex-col overscroll-contain bg-slate-950 text-slate-200',
      // The drawer scrolls as one region, so a tall header cannot collapse its menu.
      hideBrand ? 'flex-1 shrink-0' : 'h-full min-h-0 overflow-y-auto',
    )}>
      {!hideBrand && <div className="flex shrink-0 items-center gap-2 px-4 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950">
          <Navigation className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold text-white">NovaWay</span>
          <span className="text-[11px] text-cyan-200/50">Trợ lý định tuyến thông minh</span>
        </span>
      </div>}

      <nav aria-label="Điều hướng chính" className="flex shrink-0 flex-col gap-1 px-2 py-2">
        {MAIN_MENU.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 min-w-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300',
                isActive
                  ? 'border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.15)]'
                  : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'
              )
            }
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto shrink-0 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <p className="mb-2 px-2 text-sm font-medium text-white [overflow-wrap:anywhere]">{user?.email ?? 'Tài khoản'}</p>
        <DropdownMenu open={menuOpen} onOpenChange={(next) => { setMenuShift(0); setMenuOpen(next); }}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Tài khoản: ${user?.email ?? 'NovaWay'}`}
              // Open after release: a viewport-fitted popup may overlap this trigger.
              onPointerDown={(event) => { if (event.button === 0 && !event.ctrlKey) event.preventDefault(); }}
              onClick={(event) => { event.currentTarget.focus(); setMenuShift(0); setMenuOpen((current) => !current); }}
              className="flex min-h-11 w-full items-center gap-[8px] rounded-xl border border-white/10 bg-white/5 px-[8px] py-2 text-left text-sm shadow-[0_0_18px_rgba(34,211,238,0.08)] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300"
            >
              <Avatar className="h-[32px] w-[32px] shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-emerald-400 text-xs font-semibold text-slate-950">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="font-medium text-white [overflow-wrap:anywhere]">Tài khoản</span>
              </span>
              <ChevronsUpDown aria-hidden="true" className="h-[16px] w-[16px] shrink-0 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent ref={attachAccountMenu} onAnimationEnd={(event) => { if (event.target === event.currentTarget) fitAccountMenu(); }} side="top" align="start" collisionPadding={8} style={{ maxHeight: 'calc(100dvh - 16px)', translate: `0 ${menuShift}px` }} className="z-[60] w-64 max-w-[calc(100vw-1rem)] [&_[role=menuitem]]:min-h-11 [&_[role=menuitem]]:whitespace-normal [&_[role=menuitem]]:[overflow-wrap:anywhere] [&_[role=menuitem]:focus]:outline-2 [&_[role=menuitem]:focus]:outline-offset-[-2px] [&_[role=menuitem]:focus]:outline-cyan-300">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { onNavigate?.(); navigate('/account/profile'); }}>
              <User className="h-4 w-4" /> Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onNavigate?.(); navigate('/account/privacy'); }}>
              <ShieldCheck className="h-4 w-4" /> Quyền riêng tư
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onNavigate?.(); navigate('/settings'); }}>
              <SlidersHorizontal className="h-4 w-4" /> Cài đặt ứng dụng
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onNavigate?.(); navigate('/help'); }}>
              <HelpCircle className="h-4 w-4" /> Trợ giúp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut className="h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

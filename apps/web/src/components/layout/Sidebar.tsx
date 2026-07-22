import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  MapPin,
  Car,
  History,
  CloudUpload,
  Settings,
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
import { clearAuthSession } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MAIN_MENU = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/start-trip', label: 'Vị trí trực tiếp', Icon: MapPin },
  { to: '/vehicles', label: 'Quản lý phương tiện', Icon: Car },
  { to: '/trip-history', label: 'Lịch sử chuyến đi', Icon: History },
  { to: '/offline-sync', label: 'Offline Sync', Icon: CloudUpload },
  { to: '/settings', label: 'Cài đặt', Icon: Settings },
] as const;

export function Sidebar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  function handleLogout() {
    clearAuthSession();
    setUser(null);
    navigate('/login', { replace: true });
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'NW';

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-slate-950 text-slate-200">
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950">
          <Navigation className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-white">NovaWay</span>
          <span className="text-[11px] text-cyan-200/50">Trợ lý định tuyến thông minh</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {MAIN_MENU.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.15)]'
                  : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-left text-sm shadow-[0_0_18px_rgba(34,211,238,0.08)] hover:bg-white/10"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-emerald-400 text-xs font-semibold text-slate-950">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-medium text-white">{user?.email ?? 'Tài khoản'}</span>
                <span className="truncate text-xs text-cyan-200/50">NovaWay</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4" /> Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ShieldCheck className="h-4 w-4" /> Quyền riêng tư
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SlidersHorizontal className="h-4 w-4" /> Cài đặt ứng dụng
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4" /> Trợ giúp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

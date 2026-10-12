import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog } from 'radix-ui';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

// WEB-02 uses a CSS-pixel breakpoint, not a device/user-agent heuristic.
const DESKTOP_QUERY = '(min-width: 1024px)';

export function ResponsiveNavigation() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const transferFocus = useRef(false);
  const location = useLocation();

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const change = () => {
      // Only relocate focus if it belonged to navigation, not the form/route.
      transferFocus.current = Boolean(
        desktopRef.current?.contains(document.activeElement) ||
        drawerRef.current?.contains(document.activeElement) ||
        document.activeElement === triggerRef.current ||
        document.querySelector('[data-slot="dropdown-menu-content"]')?.contains(document.activeElement),
      );
      setOpen(false);
      setDesktop(query.matches);
    };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  useLayoutEffect(() => {
    if (!transferFocus.current) return;
    transferFocus.current = false;
    const target = desktop
      ? desktopRef.current?.querySelector<HTMLElement>('a[aria-current="page"], nav a')
      : triggerRef.current;
    target?.focus();
  }, [desktop]);

  // Browser Back/Forward or navigation initiated outside the drawer also closes it.
  useEffect(() => { setOpen(false); }, [location.key]);

  if (desktop) {
    return (
      <div ref={desktopRef} data-testid="desktop-navigation" className="h-full w-64 shrink-0 border-r border-white/5">
        <Sidebar />
      </div>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <Dialog.Trigger asChild>
          <button ref={triggerRef} type="button" aria-label="Mở menu điều hướng" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-cyan-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
            <Menu aria-hidden="true" className="h-6 w-6" />
          </button>
        </Dialog.Trigger>
        <span className="min-w-0 font-semibold text-white [overflow-wrap:anywhere]">NovaWay</span>
      </header>
      <Dialog.Portal>
        <Dialog.Overlay data-testid="navigation-backdrop" className="fixed inset-0 z-40 bg-slate-950/75" />
        <Dialog.Content
          ref={drawerRef}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // A desktop resize removes the trigger. Never focus that detached node.
            if (window.matchMedia(DESKTOP_QUERY).matches) event.preventDefault();
          }}
          className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(20rem,calc(100vw-2rem))] min-w-0 flex-col overflow-y-auto overscroll-contain border-r border-white/10 bg-slate-950 text-slate-100 shadow-xl"
        >
          <div className="flex shrink-0 items-start gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <Dialog.Title className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">Điều hướng NovaWay</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Đóng menu điều hướng" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <Sidebar hideBrand onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import { Suspense, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronsUpDown, LogOut, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { PageLoading } from './common';
import { LangToggle, ThemeToggle } from './toggles';

export interface ShellLink {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  /** Small counter on the right; hidden when 0. */
  badge?: number;
}

interface ShellProps {
  zone: string;
  links: ShellLink[];
  userName: string;
  userMeta: string;
  onLogout: () => void;
  /** The zone's main action, always one tap away in the top bar. */
  headerAction?: ReactNode;
  /** A notice over every page, under the top bar. */
  banner?: ReactNode;
}

function isActive(link: ShellLink, pathname: string): boolean {
  return link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`);
}

function NavUser({ userName, userMeta, onLogout }: Pick<ShellProps, 'userName' | 'userMeta' | 'onLogout'>) {
  const t = useT();
  const { isMobile } = useSidebar();
  const initial = userName.charAt(0).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userName}</span>
                <span className="truncate text-xs text-muted-foreground">{userMeta}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userMeta}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout}>
              <LogOut />
              {t('Chiqish', 'Выйти')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** On a phone the menu is a sheet over the page: choosing a page must close it. */
function NavLinks({ links, pathname }: { links: ShellLink[]; pathname: string }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu className="gap-1.5">
      {links.map((link) => (
        <SidebarMenuItem key={link.to}>
          <SidebarMenuButton asChild isActive={isActive(link, pathname)} tooltip={link.label}>
            <NavLink to={link.to} end={link.end} onClick={() => setOpenMobile(false)}>
              <link.icon />
              <span>{link.label}</span>
            </NavLink>
          </SidebarMenuButton>
          {link.badge ? <SidebarMenuBadge>{link.badge}</SidebarMenuBadge> : null}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

/** shadcn's sidebar layout: collapses to icons on a desktop, a sheet on a phone. */
export default function AppShell(props: ShellProps) {
  return (
    <TooltipProvider>
      <Shell {...props} />
    </TooltipProvider>
  );
}

function Shell({ zone, links, userName, userMeta, onLogout, headerAction, banner }: ShellProps) {
  const { pathname } = useLocation();
  const current = links.find((l) => isActive(l, pathname));

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* shadcn's sidebar header: a small mark, the name and the zone. */}
              <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                <img src="/brand/ys-icon-192.png" alt="" className="size-8 shrink-0 rounded-lg" draggable={false} />
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">YECHIM.SYSTEMS</span>
                  <span className="truncate text-xs text-muted-foreground">{zone}</span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <NavLinks links={links} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser userName={userName} userMeta={userMeta} onLogout={onLogout} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center" />
          <p className="min-w-0 truncate text-sm font-medium">{current?.label ?? zone}</p>
          <div className="ml-auto flex items-center gap-1">
            {headerAction}
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        {banner}
        {/* Keyed by path: each page fades in once when opened, never on re-render. */}
        <main key={pathname} className="flex flex-1 flex-col gap-4 p-4 animate-in fade-in-0 duration-200 md:p-6">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

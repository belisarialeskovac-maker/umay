
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarSeparator,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import {
  AreaChart,
  ArrowRightLeft,
  Boxes,
  CalendarPlus,
  ClipboardList,
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  UserCheck,
  Video,
  LogOut,
  User as UserIcon,
  Store,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import LoadingScreen from './loading-screen';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/profile', icon: UserIcon, label: 'Profile', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/shop-details', icon: Store, label: 'Shops', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/order-request', icon: ClipboardList, label: 'Order Request', roles: ['Admin', 'Superadmin'], badgeKey: 'pendingOrders' },
  { href: '/transactions', icon: ArrowRightLeft, label: 'Transactions', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/team-performance', icon: AreaChart, label: 'Team Performance', roles: ['Admin', 'Superadmin'] },
  { href: '/agent-performance', icon: UserCheck, label: 'Agent Management', roles: ['Admin', 'Superadmin'], badgeKey: 'pendingAgents' },
  { href: '/daily-added', icon: CalendarPlus, label: 'Daily Added', roles: ['Agent', 'Admin', 'Superadmin'] },
];

const settingsNav = { href: '#', icon: Settings, label: 'Settings' };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading: authLoading, isInitialLogin, completeInitialLogin } = useAuth();
  const { agents, orders, loading: dataLoading } = useData();
  
  const pendingAgentsCount = agents.filter(agent => agent.status === 'Pending').length;
  const pendingOrdersCount = orders.filter(order => order.status === 'Pending').length;

  const badgeCounts = {
    pendingAgents: pendingAgentsCount,
    pendingOrders: pendingOrdersCount,
  };

  
  if (isInitialLogin) {
    return <LoadingScreen onAnimationComplete={completeInitialLogin} />;
  }
  
  if (authLoading && !user) {
    // This covers the initial load before we know if there's a user.
    // It's a brief, blank screen to avoid flashing the login page.
    return <div className="h-screen w-full bg-background" />;
  }

  if (!user) {
    return <main className="flex-1">{children}</main>;
  }
  
  if (dataLoading) {
     return (
          <div className="flex h-screen w-full items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
      )
  }

  const userInitials = user.name?.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className='p-2'>
          <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-10">
              <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person portrait" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-foreground">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.filter(item => item.roles.includes(user.role)).map((item) => {
              const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey as keyof typeof badgeCounts] : 0;
              return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                     {badgeCount > 0 && <SidebarMenuBadge>{badgeCount}</SidebarMenuBadge>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )})}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link href="#">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout" onClick={logout}>
                <Link href="#">
                  <LogOut />
                  <span>Logout</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sticky top-0 z-20 lg:h-[60px] lg:px-6">
          <SidebarTrigger />
          <div className="w-full flex-1">
            {/* Header content like Search can go here */}
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

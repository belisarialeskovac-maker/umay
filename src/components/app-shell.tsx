
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/profile', icon: UserIcon, label: 'Profile', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/videocall-template', icon: Video, label: 'Videocall Template', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/client-details', icon: Users, label: 'Client Details', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/order-request', icon: ClipboardList, label: 'Order Request', roles: ['Admin', 'Superadmin'] },
  { href: '/transactions', icon: ArrowRightLeft, label: 'Transactions', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/team-performance', icon: AreaChart, label: 'Team Performance', roles: ['Admin', 'Superadmin'] },
  { href: '/agent-performance', icon: UserCheck, label: 'Agent Management', roles: ['Admin', 'Superadmin'] },
  { href: '/reporting', icon: FileText, label: 'Reporting', roles: ['Admin', 'Superadmin'] },
  { href: '/daily-added', icon: CalendarPlus, label: 'Daily Added', roles: ['Agent', 'Admin', 'Superadmin'] },
  { href: '/inventory', icon: Boxes, label: 'Inventory', roles: ['Admin', 'Superadmin'] },
];

const settingsNav = { href: '#', icon: Settings, label: 'Settings' };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  
  if (loading) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
      )
  }

  if (!user) {
    return <main className="flex-1">{children}</main>;
  }
  
  const userInitials = user.name?.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-8 text-primary">
              <rect width="7" height="9" x="3" y="3" rx="1"></rect>
              <rect width="7" height="5" x="14" y="3" rx="1"></rect>
              <rect width="7" height="9" x="14" y="12" rx="1"></rect>
              <rect width="7" height="5" x="3" y="16" rx="1"></rect>
            </svg>
            <h1 className="text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">Dashboard</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="flex flex-col gap-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={settingsNav.label}>
                <Link href={settingsNav.href}>
                  <settingsNav.icon />
                  <span>{settingsNav.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <div className="p-2">
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person portrait" />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold text-foreground">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden" onClick={logout}>
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
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

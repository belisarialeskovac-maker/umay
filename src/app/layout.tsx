import type { Metadata } from 'next';
import './globals.css';
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
} from '@/components/ui/sidebar';
import {
  AreaChart,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CalendarPlus,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  FileText,
  Settings,
  Users,
  UserCheck,
  Video,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'CollaBoard',
  description: 'A modern collaborative dashboard.',
};

const navItems = [
  { href: '#', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '#', icon: Video, label: 'Videocall Template' },
  { href: '#', icon: Users, label: 'Client Details' },
  { href: '#', icon: ClipboardList, label: 'Order Request' },
  { href: '#', icon: ArrowDownToLine, label: 'Deposit' },
  { href: '#', icon: ArrowUpFromLine, label: 'Withdrawal' },
  { href: '#', icon: AreaChart, label: 'Team Performance' },
  { href: '#', icon: UserCheck, label: 'Agent Performance' },
  { href: '#', icon: FileText, label: 'Reporting' },
  { href: '#', icon: CalendarPlus, label: 'Daily Added' },
  { href: '#', icon: Megaphone, label: 'Announcement' },
  { href: '#', icon: Boxes, label: 'Inventory' },
];

const settingsNav = { href: '#', icon: Settings, label: 'Settings' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
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
                <h1 className="text-xl font-semibold text-foreground">CollaBoard</h1>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {navItems.map((item, index) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton tooltip={item.label} isActive={index === 0}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="flex flex-col gap-4">
              <SidebarMenu>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip={settingsNav.label}>
                      <settingsNav.icon />
                      <span>{settingsNav.label}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <div className="p-2 border-t">
                <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
                   <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person portrait" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-semibold text-foreground">John Doe</span>
                      <span className="text-xs text-muted-foreground">john.doe@example.com</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden">
                    <ChevronRight className="size-4" />
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
        <Toaster />
      </body>
    </html>
  );
}

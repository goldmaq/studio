"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Construction,
  ClipboardList,
  HardHat,
  CarFront,
  SlidersHorizontal,
  Package,
} from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/equipment", icon: Construction, label: "Equipment" },
  { href: "/service-orders", icon: ClipboardList, label: "Service Orders" },
  { href: "/technicians", icon: HardHat, label: "Technicians" },
  { href: "/vehicles", icon: CarFront, label: "Vehicles" },
  { href: "/company-config", icon: SlidersHorizontal, label: "Company Config" },
];

function MainSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();

  return (
    <Sidebar
      variant="sidebar"
      collapsible={open ? "icon" : "offcanvas"}
      className="shadow-lg"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <Package className="w-8 h-8 text-primary" />
          <span className="font-headline text-xl font-semibold text-foreground">
            GoldMaq Control
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
                    tooltip={{ children: item.label, side: "right" }}
                    className="justify-start"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-card border-b">
            <div className="flex items-center">
               <SidebarTrigger className="md:hidden"/>
            </div>
            <div className="font-headline text-lg font-semibold">
              {navItems.find(item => item.href === usePathname() || (item.href !== "/" && usePathname().startsWith(item.href)))?.label || "Dashboard"}
            </div>
            <div>{/* User menu or other actions can go here */}</div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

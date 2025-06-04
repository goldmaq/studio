
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
import { Logo } from "@/components/icons/Logo"; // Assuming you might want to use the textual logo here too
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Painel" },
  { href: "/customers", icon: Users, label: "Clientes" },
  { href: "/equipment", icon: Construction, label: "Equipamentos" },
  { href: "/service-orders", icon: ClipboardList, label: "Ordens de Serviço" },
  { href: "/technicians", icon: HardHat, label: "Técnicos" },
  { href: "/vehicles", icon: CarFront, label: "Veículos" },
  { href: "/company-config", icon: SlidersHorizontal, label: "Config. Empresa" },
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
          {/* Using the SVG Logo component here */}
          <Logo className="h-8 w-auto" /> 
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={{ children: item.label, side: "right" }}
                      className="justify-start"
                    >
                      <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const currentPathname = usePathname();
  // Attempt to find the current nav item for page title, fallback to a generic title if needed.
  const currentNavItem = navItems.find(item => {
    if (item.href === "/") return currentPathname === "/";
    return currentPathname.startsWith(item.href);
  });
  const pageTitle = currentNavItem?.label || "Painel";


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-card border-b">
            <div className="flex items-center">
               <SidebarTrigger className="md:hidden"/>
            </div>
            <div className="font-heading text-lg font-semibold text-foreground">
              {/* Display the dynamic page title, fallback if necessary */}
              {currentPathname === "/" ? "Painel Principal" : pageTitle}
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

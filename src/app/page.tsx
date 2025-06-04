import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Construction, ClipboardList, HardHat, CarFront, SlidersHorizontal, ArrowRight } from "lucide-react";

const quickLinks = [
  { title: "Customers", href: "/customers", icon: Users, description: "Manage customer information" },
  { title: "Equipment", href: "/equipment", icon: Construction, description: "Track forklift equipment" },
  { title: "Service Orders", href: "/service-orders", icon: ClipboardList, description: "Oversee service operations" },
  { title: "Technicians", href: "/technicians", icon: HardHat, description: "Maintain technician registry" },
  { title: "Vehicles", href: "/vehicles", icon: CarFront, description: "Administer vehicle data" },
  { title: "Company Config", href: "/company-config", icon: SlidersHorizontal, description: "Set company details" },
];

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Welcome to Gold Maq Control</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your central hub for managing customers, equipment, service orders, and more.
              Use the navigation poderoso on the left or the quick links below to get started.
            </p>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-xl font-headline font-semibold mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link) => (
              <Card key={link.title} className="hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-medium font-headline">{link.title}</CardTitle>
                  <link.icon className="w-6 h-6 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{link.description}</p>
                  <Button asChild variant="outline" size="sm" className="w-full group">
                    <Link href={link.href}>
                      Go to {link.title}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

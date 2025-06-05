
import { AppLayout } from "@/components/layout/AppLayout";
import { CustomersPageContent } from "@/components/customers/CustomersPageContent"; // Updated import
import { Suspense } from 'react';

export default function CustomersPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando dados dos clientes...</div>}> {/* Updated fallback text */}
        <CustomersPageContent /> {/* Use the new wrapper component */}
      </Suspense>
    </AppLayout>
  );
}

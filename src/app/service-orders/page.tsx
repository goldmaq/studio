
import { AppLayout } from "@/components/layout/AppLayout";
import { ServiceOrdersPageContent } from "@/components/service-orders/ServiceOrdersPageContent";
import { Suspense } from 'react';

export default function ServiceOrdersPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando ordens de serviço...</div>}>
        <ServiceOrdersPageContent />
      </Suspense>
    </AppLayout>
  );
}

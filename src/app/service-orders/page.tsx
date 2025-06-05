
import { AppLayout } from "@/components/layout/AppLayout";
import { ServiceOrderClientPage } from "@/components/service-orders/ServiceOrderClientPage";
import { Suspense, useState, useEffect } from 'react';

// This wrapper ensures ServiceOrderClientPage only renders on the client
function ServiceOrderContentWrapper() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }
  return <ServiceOrderClientPage />;
}

export default function ServiceOrdersPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando ordens de serviço...</div>}>
        <ServiceOrderContentWrapper />
      </Suspense>
    </AppLayout>
  );
}

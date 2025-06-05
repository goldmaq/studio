
import { AppLayout } from "@/components/layout/AppLayout";
import { CompanyConfigClientPage } from "@/components/company-config/CompanyConfigClientPage";
import { Suspense, useState, useEffect } from 'react';

// This wrapper ensures CompanyConfigClientPage only renders on the client
function CompanyConfigContentWrapper() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // You can return a more specific loader here if needed
    return null; 
  }
  return <CompanyConfigClientPage />;
}

export default function CompanyConfigPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando configurações da empresa...</div>}>
        <CompanyConfigContentWrapper />
      </Suspense>
    </AppLayout>
  );
}

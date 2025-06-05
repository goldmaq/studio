
import { AppLayout } from "@/components/layout/AppLayout";
import { TechnicianClientPage } from "@/components/technicians/TechnicianClientPage";
import { Suspense, useState, useEffect } from 'react';

// This wrapper ensures TechnicianClientPage only renders on the client
function TechnicianContentWrapper() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }
  return <TechnicianClientPage />;
}

export default function TechniciansPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando dados dos técnicos...</div>}>
        <TechnicianContentWrapper />
      </Suspense>
    </AppLayout>
  );
}


import { AppLayout } from "@/components/layout/AppLayout";
import { VehicleClientPage } from "@/components/vehicles/VehicleClientPage";
import { Suspense, useState, useEffect } from 'react';

// This wrapper ensures VehicleClientPage only renders on the client
function VehicleContentWrapper() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }
  return <VehicleClientPage />;
}

export default function VehiclesPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando dados dos veículos...</div>}>
        <VehicleContentWrapper />
      </Suspense>
    </AppLayout>
  );
}

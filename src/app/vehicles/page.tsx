
import { AppLayout } from "@/components/layout/AppLayout";
import { VehiclesPageContent } from "@/components/vehicles/VehiclesPageContent";
import { Suspense } from 'react';

export default function VehiclesPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando dados dos veículos...</div>}>
        <VehiclesPageContent />
      </Suspense>
    </AppLayout>
  );
}

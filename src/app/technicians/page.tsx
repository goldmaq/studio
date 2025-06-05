
import { AppLayout } from "@/components/layout/AppLayout";
import { TechniciansPageContent } from "@/components/technicians/TechniciansPageContent";
import { Suspense } from 'react';

export default function TechniciansPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando dados dos técnicos...</div>}>
        <TechniciansPageContent />
      </Suspense>
    </AppLayout>
  );
}

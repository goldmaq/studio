
import { AppLayout } from "@/components/layout/AppLayout";
import { AuxiliaryEquipmentPageContent } from "@/components/auxiliary-equipment/AuxiliaryEquipmentPageContent";
import { Suspense } from 'react';

export default function AuxiliaryEquipmentPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando equipamentos auxiliares...</div>}>
        <AuxiliaryEquipmentPageContent />
      </Suspense>
    </AppLayout>
  );
}

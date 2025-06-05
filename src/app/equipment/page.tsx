
import { AppLayout } from "@/components/layout/AppLayout";
import { EquipmentClientPage } from "@/components/equipment/EquipmentClientPage";
import { Suspense } from 'react';

export default function EquipmentPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Loading equipment...</div>}>
        <EquipmentClientPage />
      </Suspense>
    </AppLayout>
  );
}

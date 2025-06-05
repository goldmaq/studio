
import { AppLayout } from "@/components/layout/AppLayout";
import { EquipmentPageContent } from "@/components/equipment/EquipmentPageContent"; // Updated import
import { Suspense } from 'react';

export default function EquipmentPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Loading equipment data...</div>}> {/* Updated fallback text for clarity */}
        <EquipmentPageContent /> {/* Use the new wrapper component */}
      </Suspense>
    </AppLayout>
  );
}

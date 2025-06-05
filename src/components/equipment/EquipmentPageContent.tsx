
"use client";

import { useSearchParams } from "next/navigation";
import { EquipmentClientPage } from "@/components/equipment/EquipmentClientPage";
import type { FC } from "react";

export const EquipmentPageContent: FC = () => {
  const searchParams = useSearchParams();
  // Safely get 'openEquipmentId', defaulting to null if searchParams is null (during SSR)
  const equipmentIdToOpen = searchParams ? searchParams.get('openEquipmentId') : null;
  
  return <EquipmentClientPage equipmentIdFromUrl={equipmentIdToOpen} />;
};


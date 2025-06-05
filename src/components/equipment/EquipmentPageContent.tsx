
"use client";

import { useSearchParams } from "next/navigation";
import { EquipmentClientPage } from "@/components/equipment/EquipmentClientPage";
import type { FC } from "react";
import { useState, useEffect } from "react"; // Import useState and useEffect

export const EquipmentPageContent: FC = () => {
  const searchParams = useSearchParams();
  // Safely get 'openEquipmentId', defaulting to null if searchParams is null (during SSR)
  const equipmentIdToOpen = searchParams ? searchParams.get('openEquipmentId') : null;
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after initial hydration
    setIsClient(true);
  }, []);

  if (!isClient) {
    // While waiting for the client to mount, you can return null or a placeholder.
    // The Suspense fallback in the parent component (src/app/equipment/page.tsx)
    // will be shown during this time.
    return null; 
  }
  
  return <EquipmentClientPage equipmentIdFromUrl={equipmentIdToOpen} />;
};


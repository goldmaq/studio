
"use client";

import { AuxiliaryEquipmentClientPage } from "@/components/auxiliary-equipment/AuxiliaryEquipmentClientPage";
import { useState, useEffect } from 'react';
import type { FC } from 'react';

export const AuxiliaryEquipmentPageContent: FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; 
  }
  return <AuxiliaryEquipmentClientPage />;
}

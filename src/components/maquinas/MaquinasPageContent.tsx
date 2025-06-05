
"use client";

import { useSearchParams } from "next/navigation";
import { MaquinasClientPage } from "@/components/maquinas/MaquinasClientPage"; // Updated import
import type { FC } from "react";
import { useState, useEffect } from "react"; 

export const MaquinasPageContent: FC = () => { // Renamed from EquipmentPageContent
  const searchParams = useSearchParams();
  const maquinaIdToOpen = searchParams ? searchParams.get('openMaquinaId') : null; // Updated query param name
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; 
  }
  
  return <MaquinasClientPage maquinaIdFromUrl={maquinaIdToOpen} />; // Updated component name and prop name
};

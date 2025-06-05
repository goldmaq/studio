
"use client";

import { TechnicianClientPage } from "@/components/technicians/TechnicianClientPage";
import { useState, useEffect } from 'react';
import type { FC } from 'react';

export const TechniciansPageContent: FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // The Suspense fallback in page.tsx will be shown
    return null;
  }
  return <TechnicianClientPage />;
}

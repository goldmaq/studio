
"use client";

import { CompanyConfigClientPage } from "@/components/company-config/CompanyConfigClientPage";
import { useState, useEffect } from 'react';
import type { FC } from 'react';

export const CompanyConfigPageContent: FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // The Suspense fallback in page.tsx will be shown
    return null; 
  }
  return <CompanyConfigClientPage />;
}

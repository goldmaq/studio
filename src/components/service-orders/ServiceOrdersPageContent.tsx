
"use client";

import { ServiceOrderClientPage } from "@/components/service-orders/ServiceOrderClientPage";
import { useState, useEffect } from 'react';
import type { FC } from 'react';

export const ServiceOrdersPageContent: FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // The Suspense fallback in page.tsx will be shown
    return null;
  }
  return <ServiceOrderClientPage />;
}

"use client";

import { ServiceOrderClientPage } from "@/components/service-orders/ServiceOrderClientPage";
import { useState, useEffect } from 'react';
import type { FC } from 'react';

export const ServiceOrdersPageContent: FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // This effect runs only on the client, after initial hydration
    setIsClient(true);
  }, []);

  if (!isClient) {
    // The Suspense fallback in page.tsx will be shown during SSR and initial client render
    return null;
  }
  // ServiceOrderClientPage will only render on the client after isClient becomes true
  return <ServiceOrderClientPage />;
}

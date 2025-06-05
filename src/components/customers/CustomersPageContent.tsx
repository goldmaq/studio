
"use client";

import { CustomerClientPage } from "@/components/customers/CustomerClientPage";
import type { FC } from "react";
import { useState, useEffect } from "react";

export const CustomersPageContent: FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after initial hydration
    setIsClient(true);
  }, []);

  if (!isClient) {
    // While waiting for the client to mount, you can return null or a placeholder.
    // The Suspense fallback in the parent component (src/app/customers/page.tsx)
    // will be shown during this time.
    return null;
  }

  return <CustomerClientPage />;
};

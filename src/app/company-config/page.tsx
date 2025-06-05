
import { AppLayout } from "@/components/layout/AppLayout";
import { CompanyConfigPageContent } from "@/components/company-config/CompanyConfigPageContent";
import { Suspense } from 'react';

export default function CompanyConfigPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando configurações da empresa...</div>}>
        <CompanyConfigPageContent />
      </Suspense>
    </AppLayout>
  );
}

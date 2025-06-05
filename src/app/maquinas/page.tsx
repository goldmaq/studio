
import { AppLayout } from "@/components/layout/AppLayout";
import { MaquinasPageContent } from "@/components/maquinas/MaquinasPageContent"; 
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Máquinas | Gold Maq',
  description: 'Gerenciamento de máquinas da Gold Maq.',
};

export default function MaquinasPage() { 
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando dados das máquinas...</div>}> 
        <MaquinasPageContent /> 
      </Suspense>
    </AppLayout>
  );
}

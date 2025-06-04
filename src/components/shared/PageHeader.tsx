import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <h1 className="text-3xl font-headline font-semibold text-foreground">{title}</h1>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

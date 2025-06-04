"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface FormModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  formId: string;
  children: ReactNode;
  isSubmitting: boolean;
  editingItem?: T | null;
}

export function FormModal<T>({
  isOpen,
  onClose,
  title,
  description,
  formId,
  children,
  isSubmitting,
  editingItem,
}: FormModalProps<T>) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
          {children}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? "Salvando..." : (editingItem ? "Salvar Alterações" : "Criar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

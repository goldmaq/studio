
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
import { Trash2, Loader2 } from "lucide-react";

interface FormModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  formId: string;
  children: ReactNode;
  isSubmitting: boolean;
  editingItem?: T | null;
  onDeleteConfirm?: () => void;
  isDeleting?: boolean;
  deleteButtonLabel?: string;
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
  onDeleteConfirm,
  isDeleting,
  deleteButtonLabel,
}: FormModalProps<T>) {
  const disableActions = isSubmitting || isDeleting;

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

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex-grow-0">
            {editingItem && onDeleteConfirm && (
              <Button
                variant="destructive"
                onClick={onDeleteConfirm}
                disabled={disableActions}
                className="w-full sm:w-auto"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {isDeleting ? "Excluindo..." : (deleteButtonLabel || "Excluir")}
              </Button>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={disableActions}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} disabled={disableActions} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? "Salvando..." : (editingItem ? "Salvar Alterações" : "Criar")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

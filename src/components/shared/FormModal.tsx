
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
import { Trash2, Loader2, Save } from "lucide-react"; // Added Save icon

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
  submitButtonLabel?: string; // New prop for submit button text
  disableSubmit?: boolean; // New prop to disable submit button
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
  submitButtonLabel, // Use new prop
  disableSubmit, // Use new prop
}: FormModalProps<T>) {
  const disableActions = isSubmitting || isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Increased max-h */}
          {children}
        </div>

        <DialogFooter className="gap-2 sm:justify-between pt-4 border-t mt-4"> {/* Added border-t and mt-4 */}
          <div className="flex-grow-0">
            {editingItem && onDeleteConfirm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDeleteConfirm}
                disabled={disableActions}
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground focus:ring-destructive/50"
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
            <Button type="button" variant="outline" onClick={onClose} disabled={disableActions}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form={formId} 
              disabled={disableActions || disableSubmit} // Use disableSubmit here
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                 <Save className="mr-2 h-4 w-4" /> 
              )}
              {isSubmitting ? (isDeleting ? "Processando..." : "Salvando...") : (submitButtonLabel || (editingItem ? "Salvar Alterações" : "Criar"))}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


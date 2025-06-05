
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, HardHat, UserCircle, Wrench, Loader2, AlertTriangle, BadgeCheck } from "lucide-react"; // Added BadgeCheck for employeeId
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Technician } from "@/types";
import { TechnicianSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const FIRESTORE_COLLECTION_NAME = "tecnicos";

async function fetchTechnicians(): Promise<Technician[]> {
  const q = query(collection(db, FIRESTORE_COLLECTION_NAME), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Technician));
}

export function TechnicianClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);

  const form = useForm<z.infer<typeof TechnicianSchema>>({
    resolver: zodResolver(TechnicianSchema),
    defaultValues: { name: "", employeeId: "", specialization: "" },
  });

  const { data: technicians = [], isLoading, isError, error } = useQuery<Technician[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchTechnicians,
  });

  const addTechnicianMutation = useMutation({
    mutationFn: async (newTechnicianData: z.infer<typeof TechnicianSchema>) => {
      return addDoc(collection(db, FIRESTORE_COLLECTION_NAME), newTechnicianData);
    },
    onSuccess: (docRef, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Técnico Adicionado", description: `${variables.name} foi adicionado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Adicionar", description: `Não foi possível adicionar o técnico ${variables.name}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: async (technicianData: Technician) => {
      const { id, ...dataToUpdate } = technicianData;
      if (!id) throw new Error("ID do técnico é necessário para atualização.");
      const techRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
      return updateDoc(techRef, dataToUpdate);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Técnico Atualizado", description: `${variables.name} foi atualizado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Atualizar", description: `Não foi possível atualizar o técnico ${variables.name}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: async (technicianId: string) => {
      if (!technicianId) throw new Error("ID do técnico é necessário para exclusão.");
      return deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, technicianId));
    },
    onSuccess: (_, technicianId) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Técnico Excluído", description: `O técnico foi removido.` });
      closeModal(); 
    },
    onError: (err: Error, technicianId) => {
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o técnico. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const openModal = (technician?: Technician) => {
    if (technician) {
      setEditingTechnician(technician);
      form.reset(technician);
    } else {
      setEditingTechnician(null);
      form.reset({ name: "", employeeId: "", specialization: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTechnician(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof TechnicianSchema>) => {
    if (editingTechnician && editingTechnician.id) {
      updateTechnicianMutation.mutate({ ...values, id: editingTechnician.id });
    } else {
      addTechnicianMutation.mutate(values);
    }
  };

  const handleModalDeleteConfirm = () => {
    if (editingTechnician && editingTechnician.id) {
      if (window.confirm(`Tem certeza que deseja excluir o técnico "${editingTechnician.name}"?`)) {
        deleteTechnicianMutation.mutate(editingTechnician.id);
      }
    }
  };
  
  const isMutating = addTechnicianMutation.isPending || updateTechnicianMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando técnicos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Técnicos</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {error?.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Cadastro de Técnicos"
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90" disabled={isMutating || deleteTechnicianMutation.isPending}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Técnico
          </Button>
        }
      />

      {technicians.length === 0 && !isLoading ? (
        <DataTablePlaceholder
          icon={HardHat}
          title="Nenhum Técnico Cadastrado"
          description="Adicione seu primeiro técnico ao cadastro."
          buttonLabel="Adicionar Técnico"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((tech) => (
            <Card 
              key={tech.id} 
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(tech)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <UserCircle className="w-10 h-10 text-primary flex-shrink-0" />
                  <div>
                    <CardTitle className="font-headline text-xl text-primary">{tech.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center text-sm">
                  <BadgeCheck className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-muted-foreground mr-1">Matrícula:</span>
                  <span>{tech.employeeId}</span>
                </p>
                {tech.specialization && (
                  <p className="flex items-center text-sm">
                    <Wrench className="mr-2 h-4 w-4 text-primary" /> 
                    <span className="font-medium text-muted-foreground mr-1">Especialização:</span> 
                    <span>{tech.specialization}</span>
                  </p>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTechnician ? "Editar Técnico" : "Adicionar Novo Técnico"}
        description="Insira os detalhes do técnico."
        formId="technician-form"
        isSubmitting={isMutating}
        editingItem={editingTechnician}
        onDeleteConfirm={handleModalDeleteConfirm}
        isDeleting={deleteTechnicianMutation.isPending}
        deleteButtonLabel="Excluir Técnico"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="technician-form" className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo do técnico" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="employeeId" render={({ field }) => (
              <FormItem><FormLabel>Matrícula</FormLabel><FormControl><Input placeholder="Identificador único do funcionário" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="specialization" render={({ field }) => (
              <FormItem><FormLabel>Especialização (Opcional)</FormLabel><FormControl><Input placeholder="ex: Hidráulica, Elétrica" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}


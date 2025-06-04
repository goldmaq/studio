
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Construction, Edit2, Trash2, Tag, Layers, CalendarDays, CheckCircle, XCircle, AlertTriangle, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Equipment } from "@/types";
import { EquipmentSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const statusOptions: Equipment['operationalStatus'][] = ['Operacional', 'Precisa de Reparo', 'Fora de Serviço'];
const statusIcons = {
  Operacional: <CheckCircle className="h-4 w-4 text-green-500" />,
  'Precisa de Reparo': <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  'Fora de Serviço': <XCircle className="h-4 w-4 text-red-500" />,
};

const FIRESTORE_COLLECTION_NAME = "equipamentos";

async function fetchEquipment(): Promise<Equipment[]> {
  const querySnapshot = await getDocs(collection(db, FIRESTORE_COLLECTION_NAME));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
}

export function EquipmentClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const form = useForm<z.infer<typeof EquipmentSchema>>({
    resolver: zodResolver(EquipmentSchema),
    defaultValues: {
      brand: "",
      model: "",
      chassisNumber: "",
      equipmentType: "",
      manufactureYear: new Date().getFullYear(),
      operationalStatus: "Operacional",
      customerId: "",
    },
  });

  const { data: equipmentList = [], isLoading, isError, error } = useQuery<Equipment[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchEquipment,
  });

  const addEquipmentMutation = useMutation({
    mutationFn: async (newEquipmentData: z.infer<typeof EquipmentSchema>) => {
      return addDoc(collection(db, FIRESTORE_COLLECTION_NAME), newEquipmentData);
    },
    onSuccess: (docRef, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Equipamento Criado", description: `${variables.brand} ${variables.model} adicionado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      console.error("Erro ao criar equipamento:", err);
      toast({ title: "Erro ao Criar", description: `Não foi possível criar ${variables.brand} ${variables.model}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async (equipmentData: Equipment) => {
      const { id, ...dataToUpdate } = equipmentData;
      if (!id) throw new Error("ID do equipamento é necessário para atualização.");
      const equipmentRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
      return updateDoc(equipmentRef, dataToUpdate);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Equipamento Atualizado", description: `${variables.brand} ${variables.model} atualizado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      console.error("Erro ao atualizar equipamento:", err);
      toast({ title: "Erro ao Atualizar", description: `Não foi possível atualizar ${variables.brand} ${variables.model}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });
  
  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      if (!equipmentId) throw new Error("ID do equipamento é necessário para exclusão.");
      return deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, equipmentId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Equipamento Excluído", description: "O equipamento foi excluído." });
    },
    onError: (err: Error) => {
      console.error("Erro ao excluir equipamento:", err);
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o equipamento. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });


  const openModal = (equipment?: Equipment) => {
    if (equipment) {
      setEditingEquipment(equipment);
      form.reset(equipment);
    } else {
      setEditingEquipment(null);
      form.reset({ brand: "", model: "", chassisNumber: "", equipmentType: "", manufactureYear: new Date().getFullYear(), operationalStatus: "Operacional", customerId: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof EquipmentSchema>) => {
    if (editingEquipment && editingEquipment.id) {
      updateEquipmentMutation.mutate({ ...values, id: editingEquipment.id });
    } else {
      addEquipmentMutation.mutate(values);
    }
  };

  const handleDelete = async (equipmentId: string) => {
     if (window.confirm("Tem certeza que deseja excluir este equipamento?")) {
      deleteEquipmentMutation.mutate(equipmentId);
    }
  };
  
  const isMutating = addEquipmentMutation.isPending || updateEquipmentMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando equipamentos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Equipamentos</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {error?.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Rastreamento de Equipamentos" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90" disabled={isMutating || deleteEquipmentMutation.isPending}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Equipamento
          </Button>
        }
      />

      {equipmentList.length === 0 && !isLoading ? (
        <DataTablePlaceholder
          icon={Construction}
          title="Nenhum Equipamento Registrado"
          description="Adicione seu primeiro equipamento para começar a rastrear."
          buttonLabel="Adicionar Equipamento"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipmentList.map((eq) => (
            <Card key={eq.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{eq.brand} {eq.model}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" /> Chassi: {eq.chassisNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><Layers className="mr-2 h-4 w-4 text-primary" /> Tipo: {eq.equipmentType}</p>
                <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" /> Ano: {eq.manufactureYear}</p>
                <p className="flex items-center">
                  {statusIcons[eq.operationalStatus]} <span className="ml-2">Status: {eq.operationalStatus}</span>
                </p>
                {eq.customerId && <p className="flex items-center"><User className="mr-2 h-4 w-4 text-primary" /> ID Cliente: {eq.customerId}</p>}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(eq)} disabled={isMutating || deleteEquipmentMutation.isPending}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(eq.id)} disabled={isMutating || deleteEquipmentMutation.isPending && deleteEquipmentMutation.variables === eq.id}>
                  {deleteEquipmentMutation.isPending && deleteEquipmentMutation.variables === eq.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Excluir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEquipment ? "Editar Equipamento" : "Adicionar Novo Equipamento"}
        description="Forneça os detalhes do equipamento."
        formId="equipment-form"
        isSubmitting={isMutating}
        editingItem={editingEquipment}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="equipment-form" className="space-y-4">
            <FormField control={form.control} name="brand" render={({ field }) => (
              <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="ex: Toyota" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="ex: 8FGCU25" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="chassisNumber" render={({ field }) => (
              <FormItem><FormLabel>Número do Chassi</FormLabel><FormControl><Input placeholder="Número único do chassi" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="equipmentType" render={({ field }) => (
              <FormItem><FormLabel>Tipo de Equipamento</FormLabel><FormControl><Input placeholder="ex: Empilhadeira, Paleteira" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="manufactureYear" render={({ field }) => (
              <FormItem><FormLabel>Ano de Fabricação</FormLabel><FormControl><Input type="number" placeholder="ex: 2022" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="operationalStatus" render={({ field }) => (
              <FormItem><FormLabel>Status Operacional</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name="customerId" render={({ field }) => (
              <FormItem><FormLabel>ID do Cliente (Opcional)</FormLabel><FormControl><Input placeholder="Vincular ao cliente, se aplicável" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

    

"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, ClipboardList, User, Construction, HardHat, Settings2, DollarSign, Calendar, FileText, Play, Pause, Check, AlertTriangle as AlertIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ServiceOrder } from "@/types";
import { ServiceOrderSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const phaseOptions: ServiceOrder['phase'][] = ['Pendente', 'Em Progresso', 'Aguardando Peças', 'Concluída', 'Cancelada'];
const phaseIcons = {
  Pendente: <AlertIcon className="h-4 w-4 text-yellow-400" />, 
  'Em Progresso': <Play className="h-4 w-4 text-blue-500" />,
  'Aguardando Peças': <Pause className="h-4 w-4 text-orange-500" />,
  Concluída: <Check className="h-4 w-4 text-green-500" />,
  Cancelada: <X className="h-4 w-4 text-red-500" />,
};

const FIRESTORE_COLLECTION_NAME = "ordensDeServico";

const formatDateForInput = (date: any): string => {
  if (!date) return "";
  if (date instanceof Timestamp) {
    return date.toDate().toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return ""; 
      return d.toISOString().split('T')[0];
    } catch (e) { return ""; }
  }
  if (date instanceof Date) {
     if (isNaN(date.getTime())) return "";
    return date.toISOString().split('T')[0];
  }
  return "";
};


const convertToTimestamp = (dateString?: string | null): Timestamp | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  const adjustedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return Timestamp.fromDate(adjustedDate);
};


async function fetchServiceOrders(): Promise<ServiceOrder[]> {
  const q = query(collection(db, FIRESTORE_COLLECTION_NAME), orderBy("startDate", "desc"), orderBy("orderNumber", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      startDate: data.startDate ? formatDateForInput(data.startDate) : undefined,
      endDate: data.endDate ? formatDateForInput(data.endDate) : undefined,
    } as ServiceOrder;
  });
}

export function ServiceOrderClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

  const form = useForm<z.infer<typeof ServiceOrderSchema>>({
    resolver: zodResolver(ServiceOrderSchema),
    defaultValues: {
      orderNumber: "", customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
      natureOfService: "", vehicleId: "", estimatedLaborCost: 0, description: "", notes: "",
      startDate: formatDateForInput(new Date().toISOString()), endDate: ""
    },
  });

  const { data: serviceOrders = [], isLoading, isError, error } = useQuery<ServiceOrder[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchServiceOrders,
  });

  const addServiceOrderMutation = useMutation({
    mutationFn: async (newOrderData: z.infer<typeof ServiceOrderSchema>) => {
      const dataToSave = {
        ...newOrderData,
        startDate: convertToTimestamp(newOrderData.startDate),
        endDate: convertToTimestamp(newOrderData.endDate),
        estimatedLaborCost: Number(newOrderData.estimatedLaborCost),
        actualLaborCost: newOrderData.actualLaborCost ? Number(newOrderData.actualLaborCost) : undefined,
      };
      return addDoc(collection(db, FIRESTORE_COLLECTION_NAME), dataToSave);
    },
    onSuccess: (docRef, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Ordem de Serviço Criada", description: `Ordem ${variables.orderNumber} criada.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Criar OS", description: `Não foi possível criar a OS ${variables.orderNumber}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const updateServiceOrderMutation = useMutation({
    mutationFn: async (orderData: ServiceOrder) => {
      const { id, ...dataToUpdate } = orderData;
      if (!id) throw new Error("ID da OS é necessário para atualização.");
      const dataToSave = {
        ...dataToUpdate,
        startDate: convertToTimestamp(orderData.startDate),
        endDate: convertToTimestamp(orderData.endDate),
        estimatedLaborCost: Number(orderData.estimatedLaborCost),
        actualLaborCost: orderData.actualLaborCost ? Number(orderData.actualLaborCost) : undefined,
      };
      const orderRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
      return updateDoc(orderRef, dataToSave);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Ordem de Serviço Atualizada", description: `Ordem ${variables.orderNumber} atualizada.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Atualizar OS", description: `Não foi possível atualizar a OS ${variables.orderNumber}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteServiceOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!orderId) throw new Error("ID da OS é necessário para exclusão.");
      return deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, orderId));
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Ordem de Serviço Excluída", description: `A OS foi excluída.` });
      closeModal(); 
    },
    onError: (err: Error, orderId) => {
      toast({ title: "Erro ao Excluir OS", description: `Não foi possível excluir a OS. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const openModal = (order?: ServiceOrder) => {
    if (order) {
      setEditingOrder(order);
      form.reset({
        ...order,
        startDate: formatDateForInput(order.startDate),
        endDate: formatDateForInput(order.endDate),
        estimatedLaborCost: Number(order.estimatedLaborCost) || 0,
        actualLaborCost: order.actualLaborCost ? Number(order.actualLaborCost) : undefined,
      });
    } else {
      setEditingOrder(null);
      form.reset({
        orderNumber: `OS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, 
        customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
        natureOfService: "", vehicleId: "", estimatedLaborCost: 0, description: "", notes: "",
        startDate: formatDateForInput(new Date().toISOString()), endDate: ""
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof ServiceOrderSchema>) => {
    const orderData = {
      ...values,
      estimatedLaborCost: Number(values.estimatedLaborCost),
      actualLaborCost: values.actualLaborCost ? Number(values.actualLaborCost) : undefined,
    };
    if (editingOrder && editingOrder.id) {
      updateServiceOrderMutation.mutate({ ...orderData, id: editingOrder.id });
    } else {
      addServiceOrderMutation.mutate(orderData);
    }
  };

  const handleModalDeleteConfirm = () => {
    if (editingOrder && editingOrder.id) {
       if (window.confirm(`Tem certeza que deseja excluir a Ordem de Serviço "${editingOrder.orderNumber}"?`)) {
        deleteServiceOrderMutation.mutate(editingOrder.id);
      }
    }
  };
  
  const isMutating = addServiceOrderMutation.isPending || updateServiceOrderMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando ordens de serviço...</p>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertIcon className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Ordens de Serviço</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {error?.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Ordens de Serviço" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90" disabled={isMutating || deleteServiceOrderMutation.isPending}>
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Ordem de Serviço
          </Button>
        }
      />

      {serviceOrders.length === 0 && !isLoading ? (
        <DataTablePlaceholder
          icon={ClipboardList}
          title="Nenhuma Ordem de Serviço Ainda"
          description="Crie sua primeira ordem de serviço para gerenciar as operações."
          buttonLabel="Criar Ordem de Serviço"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceOrders.map((order) => (
            <Card 
              key={order.id} 
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(order)}
            >
              <CardHeader>
                <CardTitle className="font-headline text-xl">Ordem: {order.orderNumber}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  {phaseIcons[order.phase]} <span className="ml-2">{order.phase}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><User className="mr-2 h-4 w-4 text-primary" /> ID Cli.: {order.customerId}</p>
                <p className="flex items-center"><Construction className="mr-2 h-4 w-4 text-primary" /> ID Equip.: {order.equipmentId}</p>
                <p className="flex items-center"><HardHat className="mr-2 h-4 w-4 text-primary" /> ID Téc.: {order.technicianId}</p>
                <p className="flex items-center"><Settings2 className="mr-2 h-4 w-4 text-primary" /> Serviço: {order.natureOfService}</p>
                <p className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-primary" /> Custo Est.: R$ {Number(order.estimatedLaborCost).toFixed(2)}</p>
                {order.startDate && <p className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary" /> Início: {formatDateForInput(order.startDate)}</p>}
                <p className="flex items-start"><FileText className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> Desc.: {order.description}</p>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                {/* Botão Editar removido */}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingOrder ? "Editar Ordem de Serviço" : "Criar Nova Ordem de Serviço"}
        description="Gerencie os detalhes da ordem de serviço."
        formId="service-order-form"
        isSubmitting={isMutating}
        editingItem={editingOrder}
        onDeleteConfirm={handleModalDeleteConfirm}
        isDeleting={deleteServiceOrderMutation.isPending}
        deleteButtonLabel="Excluir OS"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="service-order-form" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="orderNumber" render={({ field }) => (
                <FormItem><FormLabel>Número da Ordem</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem><FormLabel>ID do Cliente</FormLabel><FormControl><Input placeholder="Selecione o Cliente" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="equipmentId" render={({ field }) => (
                <FormItem><FormLabel>ID do Equipamento</FormLabel><FormControl><Input placeholder="Selecione o Equipamento" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phase" render={({ field }) => (
                <FormItem><FormLabel>Fase</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione a fase" /></SelectTrigger></FormControl>
                    <SelectContent>{phaseOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="technicianId" render={({ field }) => (
                <FormItem><FormLabel>ID do Técnico</FormLabel><FormControl><Input placeholder="Atribuir Técnico" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="natureOfService" render={({ field }) => (
                <FormItem><FormLabel>Natureza do Serviço</FormLabel><FormControl><Input placeholder="ex: Manutenção Preventiva" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem><FormLabel>ID do Veículo (Opcional)</FormLabel><FormControl><Input placeholder="Selecione o Veículo" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estimatedLaborCost" render={({ field }) => (
                <FormItem><FormLabel>Custo Estimado da Mão de Obra</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Término (Opcional)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="actualLaborCost" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Custo Real da Mão de Obra (Opcional)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descrição detalhada do serviço" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Observações adicionais" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

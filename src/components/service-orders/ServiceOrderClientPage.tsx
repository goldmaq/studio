
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, ClipboardList, Edit2, Trash2, User, Construction, HardHat, Settings2, DollarSign, Calendar, FileText, Play, Pause, Check, AlertTriangle, X, Loader2 } from "lucide-react";
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
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";

const phaseOptions: ServiceOrder['phase'][] = ['Pendente', 'Em Progresso', 'Aguardando Peças', 'Concluída', 'Cancelada'];
const phaseIcons = {
  Pendente: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  'Em Progresso': <Play className="h-4 w-4 text-blue-500" />,
  'Aguardando Peças': <Pause className="h-4 w-4 text-orange-500" />,
  Concluída: <Check className="h-4 w-4 text-green-500" />,
  Cancelada: <X className="h-4 w-4 text-red-500" />,
};

// Helper para converter Timestamp do Firestore para string YYYY-MM-DD
const formatDateForInput = (date: any): string => {
  if (!date) return "";
  if (date instanceof Timestamp) {
    return date.toDate().toISOString().split('T')[0];
  }
  if (typeof date === 'string') { // Se já for string, retorna (útil para defaultValues)
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch (e) { return ""; }
  }
  return "";
};

const FIRESTORE_COLLECTION_NAME = "ordensDeServico";

export function ServiceOrderClientPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof ServiceOrderSchema>>({
    resolver: zodResolver(ServiceOrderSchema),
    defaultValues: {
      orderNumber: "", customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
      natureOfService: "", vehicleId: "", estimatedLaborCost: 0, description: "", notes: "",
      startDate: new Date().toISOString().split('T')[0], endDate: ""
    },
  });

  useEffect(() => {
    const fetchServiceOrders = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, FIRESTORE_COLLECTION_NAME));
        const ordersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
            startDate: data.startDate ? formatDateForInput(data.startDate) : undefined,
            endDate: data.endDate ? formatDateForInput(data.endDate) : undefined,
          } as ServiceOrder;
        });
        setServiceOrders(ordersData);
      } catch (error) {
        console.error("Erro ao buscar ordens de serviço:", error);
        toast({ title: "Erro ao Carregar Ordens", description: "Não foi possível buscar os dados das ordens de serviço.", variant: "destructive" });
      }
      setIsLoading(false);
    };
    fetchServiceOrders();
  }, [toast]);

  const openModal = (order?: ServiceOrder) => {
    if (order) {
      setEditingOrder(order);
      form.reset({
        ...order,
        startDate: formatDateForInput(order.startDate),
        endDate: formatDateForInput(order.endDate),
      });
    } else {
      setEditingOrder(null);
      form.reset({
        orderNumber: `OS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, 
        customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
        natureOfService: "", vehicleId: "", estimatedLaborCost: 0, description: "", notes: "",
        startDate: new Date().toISOString().split('T')[0], endDate: ""
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
    try {
      const dataToSave = {
        ...values,
        startDate: values.startDate ? Timestamp.fromDate(new Date(values.startDate)) : null,
        endDate: values.endDate ? Timestamp.fromDate(new Date(values.endDate)) : null,
      };

      if (editingOrder) {
        const orderRef = doc(db, FIRESTORE_COLLECTION_NAME, editingOrder.id);
        await updateDoc(orderRef, dataToSave);
        setServiceOrders(serviceOrders.map((o) => (o.id === editingOrder.id ? { ...editingOrder, ...values } : o))); // Usa values para UI
        toast({ title: "Ordem de Serviço Atualizada", description: `Ordem ${values.orderNumber} atualizada.` });
      } else {
        const docRef = await addDoc(collection(db, FIRESTORE_COLLECTION_NAME), dataToSave);
        setServiceOrders([...serviceOrders, { id: docRef.id, ...values }]); // Usa values para UI
        toast({ title: "Ordem de Serviço Criada", description: `Ordem ${values.orderNumber} criada.` });
      }
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar ordem de serviço:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar os dados da ordem de serviço.", variant: "destructive" });
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, orderId));
      setServiceOrders(serviceOrders.filter(o => o.id !== orderId));
      toast({ title: "Ordem de Serviço Excluída", description: "A ordem de serviço foi excluída.", variant: "default" });
    } catch (error) {
      console.error("Erro ao excluir ordem de serviço:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir a ordem de serviço.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando ordens de serviço...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Ordens de Serviço" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Ordem de Serviço
          </Button>
        }
      />

      {serviceOrders.length === 0 ? (
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
            <Card key={order.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
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
                <p className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-primary" /> Custo Est.: R$ {order.estimatedLaborCost.toFixed(2)}</p>
                {order.startDate && <p className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary" /> Início: {formatDateForInput(order.startDate)}</p>}
                <p className="flex items-start"><FileText className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> Desc.: {order.description}</p>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(order)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(order.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
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
        isSubmitting={form.formState.isSubmitting}
        editingItem={editingOrder}
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
                <FormItem><FormLabel>Custo Estimado da Mão de Obra</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Término (Opcional)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
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

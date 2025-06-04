"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Construction, Edit2, Trash2, Tag, Layers, CalendarDays, CheckCircle, XCircle, AlertTriangle, User } from "lucide-react";
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

const initialEquipment: Equipment[] = [
  { id: "eq1", brand: "Toyota", model: "8FGCU25", chassisNumber: "TY0012345", equipmentType: "Forklift", manufactureYear: 2021, operationalStatus: "Operacional", customerId: "1" },
  { id: "eq2", brand: "Hyster", model: "H50FT", chassisNumber: "HY0067890", equipmentType: "Forklift", manufactureYear: 2019, operationalStatus: "Precisa de Reparo", customerId: "2" },
];

const statusOptions: Equipment['operationalStatus'][] = ['Operacional', 'Precisa de Reparo', 'Fora de Serviço'];
const statusIcons = {
  Operacional: <CheckCircle className="h-4 w-4 text-green-500" />,
  'Precisa de Reparo': <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  'Fora de Serviço': <XCircle className="h-4 w-4 text-red-500" />,
};


export function EquipmentClientPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(initialEquipment);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const { toast } = useToast();

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

  const onSubmit = (values: z.infer<typeof EquipmentSchema>) => {
    if (editingEquipment) {
      setEquipmentList(equipmentList.map((eq) => (eq.id === editingEquipment.id ? { ...eq, ...values } : eq)));
      toast({ title: "Equipamento Atualizado", description: `${values.brand} ${values.model} atualizado.` });
    } else {
      setEquipmentList([...equipmentList, { id: String(Date.now()), ...values }]);
      toast({ title: "Equipamento Criado", description: `${values.brand} ${values.model} adicionado.` });
    }
    closeModal();
  };

  const handleDelete = (equipmentId: string) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== equipmentId));
    toast({ title: "Equipamento Excluído", description: "O equipamento foi excluído.", variant: "destructive" });
  };

  return (
    <>
      <PageHeader 
        title="Rastreamento de Equipamentos" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Equipamento
          </Button>
        }
      />

      {equipmentList.length === 0 ? (
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
                <Button variant="outline" size="sm" onClick={() => openModal(eq)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(eq.id)}>
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
        title={editingEquipment ? "Editar Equipamento" : "Adicionar Novo Equipamento"}
        description="Forneça os detalhes do equipamento."
        formId="equipment-form"
        isSubmitting={form.formState.isSubmitting}
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
              <FormItem><FormLabel>Ano de Fabricação</FormLabel><FormControl><Input type="number" placeholder="ex: 2022" {...field} /></FormControl><FormMessage /></FormItem>
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
              <FormItem><FormLabel>ID do Cliente (Opcional)</FormLabel><FormControl><Input placeholder="Vincular ao cliente, se aplicável" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

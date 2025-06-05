
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, CarFront, Tag, Gauge, Droplets, Coins, FileBadge, CircleCheck, WrenchIcon, Loader2, AlertTriangle, DollarSign } from "lucide-react"; // Added DollarSign
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Vehicle } from "@/types";
import { VehicleSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const statusOptions: Vehicle['status'][] = ['Disponível', 'Em Uso', 'Manutenção'];
const statusIcons = {
  Disponível: <CircleCheck className="h-4 w-4 text-green-500" />,
  'Em Uso': <CarFront className="h-4 w-4 text-blue-500" />,
  Manutenção: <WrenchIcon className="h-4 w-4 text-yellow-500" />,
};

const FIRESTORE_COLLECTION_NAME = "veiculos";

async function fetchVehicles(): Promise<Vehicle[]> {
  const q = query(collection(db, FIRESTORE_COLLECTION_NAME), orderBy("model", "asc"), orderBy("licensePlate", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        model: data.model,
        licensePlate: data.licensePlate,
        kind: data.kind,
        currentMileage: Number(data.currentMileage),
        fuelConsumption: Number(data.fuelConsumption),
        costPerKilometer: Number(data.costPerKilometer),
        fipeValue: data.fipeValue !== undefined && data.fipeValue !== null ? Number(data.fipeValue) : null,
        registrationInfo: data.registrationInfo,
        status: data.status,
    } as Vehicle;
  });
}

export function VehicleClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const form = useForm<z.infer<typeof VehicleSchema>>({
    resolver: zodResolver(VehicleSchema),
    defaultValues: { model: "", licensePlate: "", kind: "", currentMileage: 0, fuelConsumption: 0, costPerKilometer: 0, fipeValue: null, registrationInfo: "", status: "Disponível" },
  });

  const { data: vehicles = [], isLoading, isError, error } = useQuery<Vehicle[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchVehicles,
  });

  const addVehicleMutation = useMutation({
    mutationFn: async (newVehicleData: z.infer<typeof VehicleSchema>) => {
      // Zod schema with z.coerce.number() handles parsing for numeric fields
      return addDoc(collection(db, FIRESTORE_COLLECTION_NAME), newVehicleData);
    },
    onSuccess: (docRef, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Veículo Adicionado", description: `${variables.model} (${variables.licensePlate}) adicionado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Adicionar", description: `Não foi possível adicionar ${variables.model}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async (vehicleData: Vehicle) => {
      const { id, ...dataToUpdate } = vehicleData;
      if (!id) throw new Error("ID do veículo é necessário para atualização.");
      // Zod schema handles coercion, so dataToUpdate already has correct types
      const vehicleRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
      return updateDoc(vehicleRef, dataToUpdate);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Veículo Atualizado", description: `${variables.model} (${variables.licensePlate}) atualizado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Atualizar", description: `Não foi possível atualizar ${variables.model}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      if (!vehicleId) throw new Error("ID do veículo é necessário para exclusão.");
      return deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, vehicleId));
    },
    onSuccess: (_, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Veículo Excluído", description: `O veículo foi removido.` });
      closeModal(); 
    },
    onError: (err: Error, vehicleId) => {
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o veículo. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const openModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      form.reset({
        ...vehicle,
        currentMileage: Number(vehicle.currentMileage),
        fuelConsumption: Number(vehicle.fuelConsumption),
        costPerKilometer: Number(vehicle.costPerKilometer),
        fipeValue: vehicle.fipeValue !== undefined && vehicle.fipeValue !== null ? Number(vehicle.fipeValue) : null,
      });
    } else {
      setEditingVehicle(null);
      form.reset({ model: "", licensePlate: "", kind: "", currentMileage: 0, fuelConsumption: 0, costPerKilometer: 0, fipeValue: null, registrationInfo: "", status: "Disponível" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof VehicleSchema>) => {
    if (editingVehicle && editingVehicle.id) {
      updateVehicleMutation.mutate({ ...values, id: editingVehicle.id });
    } else {
      addVehicleMutation.mutate(values);
    }
  };

  const handleModalDeleteConfirm = () => {
    if (editingVehicle && editingVehicle.id) {
       if (window.confirm(`Tem certeza que deseja excluir o veículo "${editingVehicle.model} (${editingVehicle.licensePlate})"?`)) {
        deleteVehicleMutation.mutate(editingVehicle.id);
      }
    }
  };

  const isMutating = addVehicleMutation.isPending || updateVehicleMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando veículos...</p>
      </div>
    );
  }

  if (isError) {
     return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Veículos</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {error?.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Gerenciamento de Veículos"
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90" disabled={isMutating || deleteVehicleMutation.isPending}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Veículo
          </Button>
        }
      />

      {vehicles.length === 0 && !isLoading ? (
        <DataTablePlaceholder
          icon={CarFront}
          title="Nenhum Veículo Registrado"
          description="Registre seu primeiro veículo para gerenciar sua frota."
          buttonLabel="Adicionar Veículo"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Card 
              key={vehicle.id} 
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(vehicle)}
            >
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">{vehicle.model}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" /> Placa: {vehicle.licensePlate} ({vehicle.kind})
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><Gauge className="mr-2 h-4 w-4 text-primary" /> KM: {Number(vehicle.currentMileage).toLocaleString('pt-BR')} km</p>
                <p className="flex items-center"><Droplets className="mr-2 h-4 w-4 text-primary" /> Cons. Médio: {Number(vehicle.fuelConsumption)} km/L</p>
                <p className="flex items-center"><Coins className="mr-2 h-4 w-4 text-primary" /> Custo/km: R$ {Number(vehicle.costPerKilometer).toFixed(2)}</p>
                {vehicle.fipeValue !== null && vehicle.fipeValue !== undefined && (
                  <p className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-primary" /> FIPE: {Number(vehicle.fipeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                )}
                <p className="flex items-center">
                  {statusIcons[vehicle.status]} <span className="ml-2">Status: {vehicle.status}</span>
                </p>
                {vehicle.registrationInfo && <p className="flex items-center"><FileBadge className="mr-2 h-4 w-4 text-primary" /> Info. Reg.: {vehicle.registrationInfo}</p>}
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
        title={editingVehicle ? "Editar Veículo" : "Adicionar Novo Veículo"}
        description="Forneça os detalhes do veículo."
        formId="vehicle-form"
        isSubmitting={isMutating}
        editingItem={editingVehicle}
        onDeleteConfirm={handleModalDeleteConfirm}
        isDeleting={deleteVehicleMutation.isPending}
        deleteButtonLabel="Excluir Veículo"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="vehicle-form" className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="ex: Fiat Fiorino" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                  <FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="ABC1D23" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="kind" render={({ field }) => (
                  <FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="ex: Van, Carro, Moto" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currentMileage" render={({ field }) => (
                  <FormItem><FormLabel>Quilometragem Atual (km)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fuelConsumption" render={({ field }) => (
                  <FormItem><FormLabel>Consumo de Combustível (km/L)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="costPerKilometer" render={({ field }) => (
                  <FormItem><FormLabel>Custo por Quilômetro (R$)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="fipeValue" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Valor Tabela FIPE (R$) (Opcional)</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="Ex: 29243" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                      <SelectContent>{statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>
            <FormField control={form.control} name="registrationInfo" render={({ field }) => (
              <FormItem><FormLabel>Informações de Registro (Opcional)</FormLabel><FormControl><Input placeholder="ex: Renavam, Chassi" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}


"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, CarFront, Edit2, Trash2, Tag, Gauge, Droplets, Coins, FileBadge, CircleCheck, WrenchIcon, Loader2, AlertTriangle } from "lucide-react";
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
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const statusOptions: Vehicle['status'][] = ['Disponível', 'Em Uso', 'Manutenção'];
const statusIcons = {
  Disponível: <CircleCheck className="h-4 w-4 text-green-500" />,
  'Em Uso': <CarFront className="h-4 w-4 text-blue-500" />,
  Manutenção: <WrenchIcon className="h-4 w-4 text-yellow-500" />,
};

const FIRESTORE_COLLECTION_NAME = "veiculos";

async function fetchVehicles(): Promise<Vehicle[]> {
  const querySnapshot = await getDocs(collection(db, FIRESTORE_COLLECTION_NAME));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Vehicle));
}

export function VehicleClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const form = useForm<z.infer<typeof VehicleSchema>>({
    resolver: zodResolver(VehicleSchema),
    defaultValues: { model: "", licensePlate: "", kind: "", currentMileage: 0, fuelConsumption: 0, costPerKilometer: 0, registrationInfo: "", status: "Disponível" },
  });

  const { data: vehicles = [], isLoading, isError, error } = useQuery<Vehicle[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchVehicles,
  });

  const addVehicleMutation = useMutation({
    mutationFn: async (newVehicleData: z.infer<typeof VehicleSchema>) => {
      const dataToSave = {
        ...newVehicleData,
        currentMileage: Number(newVehicleData.currentMileage),
        fuelConsumption: Number(newVehicleData.fuelConsumption),
        costPerKilometer: Number(newVehicleData.costPerKilometer),
      };
      return addDoc(collection(db, FIRESTORE_COLLECTION_NAME), dataToSave);
    },
    onSuccess: (docRef, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Veículo Adicionado", description: `${variables.model} (${variables.licensePlate}) adicionado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      console.error("Erro ao adicionar veículo:", err);
      toast({ title: "Erro ao Adicionar", description: `Não foi possível adicionar ${variables.model}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async (vehicleData: Vehicle) => {
      const { id, ...dataToUpdate } = vehicleData;
      if (!id) throw new Error("ID do veículo é necessário para atualização.");
       const dataToSave = {
        ...dataToUpdate,
        currentMileage: Number(dataToUpdate.currentMileage),
        fuelConsumption: Number(dataToUpdate.fuelConsumption),
        costPerKilometer: Number(dataToUpdate.costPerKilometer),
      };
      const vehicleRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
      return updateDoc(vehicleRef, dataToSave);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Veículo Atualizado", description: `${variables.model} (${variables.licensePlate}) atualizado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      console.error("Erro ao atualizar veículo:", err);
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
      toast({ title: "Veículo Excluído", description: `O veículo (ID: ${vehicleId}) foi removido.` });
    },
    onError: (err: Error, vehicleId) => {
      console.error("Erro ao excluir veículo:", err);
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o veículo (ID: ${vehicleId}). Detalhe: ${err.message}`, variant: "destructive" });
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
      });
    } else {
      setEditingVehicle(null);
      form.reset({ model: "", licensePlate: "", kind: "", currentMileage: 0, fuelConsumption: 0, costPerKilometer: 0, registrationInfo: "", status: "Disponível" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof VehicleSchema>) => {
     const vehicleData = {
      ...values,
      currentMileage: Number(values.currentMileage),
      fuelConsumption: Number(values.fuelConsumption),
      costPerKilometer: Number(values.costPerKilometer),
    };
    if (editingVehicle && editingVehicle.id) {
      updateVehicleMutation.mutate({ ...vehicleData, id: editingVehicle.id });
    } else {
      addVehicleMutation.mutate(vehicleData);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (window.confirm(`Tem certeza que deseja excluir o veículo "${vehicle.model} (${vehicle.licensePlate})"?`)) {
      deleteVehicleMutation.mutate(vehicle.id);
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
            <Card key={vehicle.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{vehicle.model}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" /> Placa: {vehicle.licensePlate} ({vehicle.kind})
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><Gauge className="mr-2 h-4 w-4 text-primary" /> KM: {Number(vehicle.currentMileage).toLocaleString()} km</p>
                <p className="flex items-center"><Droplets className="mr-2 h-4 w-4 text-primary" /> Cons. Médio: {Number(vehicle.fuelConsumption)} km/L</p>
                <p className="flex items-center"><Coins className="mr-2 h-4 w-4 text-primary" /> Custo/km: R$ {Number(vehicle.costPerKilometer).toFixed(2)}</p>
                <p className="flex items-center">
                  {statusIcons[vehicle.status]} <span className="ml-2">Status: {vehicle.status}</span>
                </p>
                {vehicle.registrationInfo && <p className="flex items-center"><FileBadge className="mr-2 h-4 w-4 text-primary" /> Info. Reg.: {vehicle.registrationInfo}</p>}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(vehicle)} disabled={isMutating || deleteVehicleMutation.isPending}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(vehicle)} disabled={deleteVehicleMutation.isPending && deleteVehicleMutation.variables === vehicle.id}>
                   {deleteVehicleMutation.isPending && deleteVehicleMutation.variables === vehicle.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
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
        title={editingVehicle ? "Editar Veículo" : "Adicionar Novo Veículo"}
        description="Forneça os detalhes do veículo."
        formId="vehicle-form"
        isSubmitting={isMutating}
        editingItem={editingVehicle}
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
                  <FormItem><FormLabel>Quilometragem Atual (km)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fuelConsumption" render={({ field }) => (
                  <FormItem><FormLabel>Consumo de Combustível (km/L)</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="costPerKilometer" render={({ field }) => (
                  <FormItem><FormLabel>Custo por Quilômetro (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>
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
              <FormItem><FormLabel>Informações de Registro (Opcional)</FormLabel><FormControl><Input placeholder="ex: Renavam" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}


"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, CarFront, Edit2, Trash2, Tag, Gauge, Droplets, Coins, FileBadge, CircleCheck, WrenchIcon, Loader2 } from "lucide-react";
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

const statusOptions: Vehicle['status'][] = ['Disponível', 'Em Uso', 'Manutenção'];
const statusIcons = {
  Disponível: <CircleCheck className="h-4 w-4 text-green-500" />,
  'Em Uso': <CarFront className="h-4 w-4 text-blue-500" />,
  Manutenção: <WrenchIcon className="h-4 w-4 text-yellow-500" />,
};

const FIRESTORE_COLLECTION_NAME = "veiculos";

export function VehicleClientPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof VehicleSchema>>({
    resolver: zodResolver(VehicleSchema),
    defaultValues: { model: "", licensePlate: "", kind: "", currentMileage: 0, fuelConsumption: 0, costPerKilometer: 0, registrationInfo: "", status: "Disponível" },
  });

  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, FIRESTORE_COLLECTION_NAME));
        const vehiclesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        setVehicles(vehiclesData);
      } catch (error) {
        console.error("Erro ao buscar veículos:", error);
        toast({ title: "Erro ao Carregar Veículos", description: "Não foi possível buscar os dados dos veículos.", variant: "destructive" });
      }
      setIsLoading(false);
    };
    fetchVehicles();
  }, [toast]);

  const openModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      form.reset(vehicle);
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
    try {
      if (editingVehicle) {
        const vehicleRef = doc(db, FIRESTORE_COLLECTION_NAME, editingVehicle.id);
        await updateDoc(vehicleRef, values);
        setVehicles(vehicles.map((v) => (v.id === editingVehicle.id ? { ...v, ...values } : v)));
        toast({ title: "Veículo Atualizado", description: `${values.model} (${values.licensePlate}) atualizado.` });
      } else {
        const docRef = await addDoc(collection(db, FIRESTORE_COLLECTION_NAME), values);
        setVehicles([...vehicles, { id: docRef.id, ...values }]);
        toast({ title: "Veículo Adicionado", description: `${values.model} (${values.licensePlate}) adicionado.` });
      }
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar veículo:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar os dados do veículo.", variant: "destructive" });
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, vehicleId));
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast({ title: "Veículo Excluído", description: "O veículo foi removido.", variant: "default" });
    } catch (error) {
      console.error("Erro ao excluir veículo:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o veículo.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando veículos...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Gerenciamento de Veículos"
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Veículo
          </Button>
        }
      />

      {vehicles.length === 0 ? (
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
                <p className="flex items-center"><Gauge className="mr-2 h-4 w-4 text-primary" /> KM: {vehicle.currentMileage.toLocaleString()} km</p>
                <p className="flex items-center"><Droplets className="mr-2 h-4 w-4 text-primary" /> Cons. Médio: {vehicle.fuelConsumption} km/L</p>
                <p className="flex items-center"><Coins className="mr-2 h-4 w-4 text-primary" /> Custo/km: R$ {vehicle.costPerKilometer.toFixed(2)}</p>
                <p className="flex items-center">
                  {statusIcons[vehicle.status]} <span className="ml-2">Status: {vehicle.status}</span>
                </p>
                {vehicle.registrationInfo && <p className="flex items-center"><FileBadge className="mr-2 h-4 w-4 text-primary" /> Info. Reg.: {vehicle.registrationInfo}</p>}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(vehicle)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(vehicle.id)}>
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
        title={editingVehicle ? "Editar Veículo" : "Adicionar Novo Veículo"}
        description="Forneça os detalhes do veículo."
        formId="vehicle-form"
        isSubmitting={form.formState.isSubmitting}
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
                  <FormItem><FormLabel>Quilometragem Atual (km)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fuelConsumption" render={({ field }) => (
                  <FormItem><FormLabel>Consumo de Combustível (km/L)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="costPerKilometer" render={({ field }) => (
                  <FormItem><FormLabel>Custo por Quilômetro (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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

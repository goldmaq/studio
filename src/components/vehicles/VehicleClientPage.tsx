"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, CarFront, Edit2, Trash2, Tag, Gauge, Droplets, Coins, FileBadge, CircleCheck, CircleX, WrenchIcon } from "lucide-react";
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

const initialVehicles: Vehicle[] = [
  { id: "v1", model: "Fiat Fiorino", licensePlate: "BRA2E19", kind: "Van", currentMileage: 120500, fuelConsumption: 10.5, costPerKilometer: 0.55, status: "Disponível", registrationInfo: "Renavam: 1234567890" },
  { id: "v2", model: "Honda CG 160", licensePlate: "XYZ1234", kind: "Motorcycle", currentMileage: 35200, fuelConsumption: 35, costPerKilometer: 0.15, status: "Em Uso" },
];

const statusOptions: Vehicle['status'][] = ['Disponível', 'Em Uso', 'Manutenção'];
const statusIcons = {
  Disponível: <CircleCheck className="h-4 w-4 text-green-500" />,
  'Em Uso': <CarFront className="h-4 w-4 text-blue-500" />,
  Manutenção: <WrenchIcon className="h-4 w-4 text-yellow-500" />,
};

export function VehicleClientPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof VehicleSchema>>({
    resolver: zodResolver(VehicleSchema),
    defaultValues: { model: "", licensePlate: "", kind: "", currentMileage: 0, fuelConsumption: 0, costPerKilometer: 0, registrationInfo: "", status: "Disponível" },
  });

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

  const onSubmit = (values: z.infer<typeof VehicleSchema>) => {
    if (editingVehicle) {
      setVehicles(vehicles.map((v) => (v.id === editingVehicle.id ? { ...v, ...values } : v)));
      toast({ title: "Veículo Atualizado", description: `${values.model} (${values.licensePlate}) atualizado.` });
    } else {
      setVehicles([...vehicles, { id: String(Date.now()), ...values }]);
      toast({ title: "Veículo Adicionado", description: `${values.model} (${values.licensePlate}) adicionado.` });
    }
    closeModal();
  };

  const handleDelete = (vehicleId: string) => {
    setVehicles(vehicles.filter(v => v.id !== vehicleId));
    toast({ title: "Veículo Excluído", description: "O veículo foi removido.", variant: "destructive" });
  };

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
              <FormItem><FormLabel>Informações de Registro (Opcional)</FormLabel><FormControl><Input placeholder="ex: Renavam" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

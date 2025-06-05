
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, CarFront, Tag, Gauge, Droplets, Coins, FileBadge, CircleCheck, WrenchIcon, Loader2, AlertTriangle, DollarSign, Car } from "lucide-react"; // Added Car for Kind
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
import { cn } from "@/lib/utils";

const statusOptions: Vehicle['status'][] = ['Disponível', 'Em Uso', 'Manutenção'];
const statusIcons = {
  Disponível: <CircleCheck className="h-4 w-4 text-green-500" />,
  'Em Uso': <CarFront className="h-4 w-4 text-blue-500" />,
  Manutenção: <WrenchIcon className="h-4 w-4 text-yellow-500" />,
};

const FIRESTORE_COLLECTION_NAME = "veiculos";

const mockVehiclesData: Vehicle[] = [
  { id: "mock1", model: "FIAT DOBLO", licensePlate: "ENC8C91", fipeValue: 29243, kind: "Furgão", currentMileage: 150000, fuelConsumption: 9.5, costPerKilometer: 0.6, status: "Disponível", registrationInfo: "Exemplo" },
  { id: "mock2", model: "FIAT FIORINO", licensePlate: "FQC4777", fipeValue: 48869, kind: "Furgão", currentMileage: 80000, fuelConsumption: 11.0, costPerKilometer: 0.5, status: "Em Uso", registrationInfo: "Exemplo" },
  { id: "mock3", model: "FIAT STRADA", licensePlate: "CUL3A99", fipeValue: 70000, kind: "Picape", currentMileage: 50000, fuelConsumption: 12.5, costPerKilometer: 0.45, status: "Disponível", registrationInfo: "Exemplo" },
  { id: "mock4", model: "FIAT STRADA", licensePlate: "ENG1878", fipeValue: 68424, kind: "Picape", currentMileage: 60000, fuelConsumption: 12.0, costPerKilometer: 0.48, status: "Manutenção", registrationInfo: "Exemplo" },
  { id: "mock5", model: "RENAULT MASTER", licensePlate: "GDZ8E43", fipeValue: 320000, kind: "Van", currentMileage: 200000, fuelConsumption: 8.0, costPerKilometer: 0.7, status: "Disponível", registrationInfo: "Exemplo" },
  { id: "mock6", model: "RENAULT MASTER", licensePlate: "LTB7E97", fipeValue: 259000, kind: "Van", currentMileage: 120000, fuelConsumption: 8.5, costPerKilometer: 0.65, status: "Em Uso", registrationInfo: "Exemplo" },
  { id: "mock7", model: "VOLKSWAGEN SAVEIRO", licensePlate: "DFJ5I61", fipeValue: 37723, kind: "Picape", currentMileage: 95000, fuelConsumption: 11.5, costPerKilometer: 0.52, status: "Disponível", registrationInfo: "Exemplo" },
];

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

  const { data: vehiclesFromFirestore = [], isLoading, isError, error } = useQuery<Vehicle[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchVehicles,
  });

  const isMockDataActive = vehiclesFromFirestore.length === 0 && !isLoading && !isError;
  const vehiclesToDisplay = isMockDataActive ? mockVehiclesData : vehiclesFromFirestore;


  const addVehicleMutation = useMutation({
    mutationFn: async (newVehicleData: z.infer<typeof VehicleSchema>) => {
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
      if (!id || id.startsWith("mock")) throw new Error("ID do veículo inválido para atualização.");
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
      if (!vehicleId || vehicleId.startsWith("mock")) throw new Error("ID do veículo inválido para exclusão.");
      return deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, vehicleId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Veículo Excluído", description: `O veículo foi removido.` });
      closeModal(); 
    },
    onError: (err: Error) => {
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
    if (editingVehicle && editingVehicle.id && !editingVehicle.id.startsWith("mock")) {
      updateVehicleMutation.mutate({ ...values, id: editingVehicle.id });
    } else {
      addVehicleMutation.mutate(values);
    }
  };

  const handleModalDeleteConfirm = () => {
    if (editingVehicle && editingVehicle.id && !editingVehicle.id.startsWith("mock")) {
       if (window.confirm(`Tem certeza que deseja excluir o veículo "${editingVehicle.model} (${editingVehicle.licensePlate})"?`)) {
        deleteVehicleMutation.mutate(editingVehicle.id);
      }
    } else {
      toast({ title: "Ação Inválida", description: "Não é possível excluir um veículo de exemplo ou não salvo.", variant: "default" });
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

      {isMockDataActive && (
         <Card className="mb-6 bg-accent/10 border-accent/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-accent-foreground font-headline text-lg">Dados de Exemplo Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80">
              Os veículos listados abaixo são exemplos para demonstração, pois nenhum veículo foi encontrado no banco de dados.
              Clique em um card para preencher o formulário e então salve para adicioná-lo permanentemente.
            </p>
          </CardContent>
        </Card>
      )}

      {vehiclesToDisplay.length === 0 && !isMockDataActive ? (
        <DataTablePlaceholder
          icon={CarFront}
          title="Nenhum Veículo Registrado"
          description="Registre seu primeiro veículo para gerenciar sua frota."
          buttonLabel="Adicionar Veículo"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehiclesToDisplay.map((vehicle) => (
            <Card 
              key={vehicle.id} 
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(vehicle)}
            >
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">{vehicle.model}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center text-sm">
                  <Tag className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-muted-foreground mr-1">Placa:</span>
                  <span>{vehicle.licensePlate}</span>
                </p>
                <p className="flex items-center text-sm">
                  <Car className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-muted-foreground mr-1">Tipo:</span>
                  <span>{vehicle.kind}</span>
                </p>
                <p className="flex items-center text-sm">
                  <Gauge className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium text-muted-foreground mr-1">KM Atual:</span> 
                  <span>{Number(vehicle.currentMileage).toLocaleString('pt-BR')} km</span>
                </p>
                <p className="flex items-center text-sm">
                  <Droplets className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium text-muted-foreground mr-1">Consumo:</span>
                  <span>{Number(vehicle.fuelConsumption)} km/L</span>
                </p>
                <p className="flex items-center text-sm">
                  <Coins className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium text-muted-foreground mr-1">Custo/km:</span>
                  <span>R$ {Number(vehicle.costPerKilometer).toFixed(2)}</span>
                </p>
                {vehicle.fipeValue !== null && vehicle.fipeValue !== undefined && (
                  <p className="flex items-center text-sm">
                    <DollarSign className="mr-2 h-4 w-4 text-primary" /> 
                    <span className="font-medium text-muted-foreground mr-1">FIPE:</span>
                    <span>{Number(vehicle.fipeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </p>
                )}
                <p className="flex items-center text-sm">
                  {statusIcons[vehicle.status]} 
                  <span className="font-medium text-muted-foreground ml-2 mr-1">Status:</span>
                   <span className={cn({
                    'text-green-600': vehicle.status === 'Disponível',
                    'text-blue-600': vehicle.status === 'Em Uso',
                    'text-yellow-600': vehicle.status === 'Manutenção',
                  })}>
                    {vehicle.status}
                  </span>
                </p>
                {vehicle.registrationInfo && (
                  <p className="flex items-center text-sm">
                    <FileBadge className="mr-2 h-4 w-4 text-primary" /> 
                    <span className="font-medium text-muted-foreground mr-1">Registro:</span>
                    <span>{vehicle.registrationInfo}</span>
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
        title={editingVehicle && editingVehicle.id && !editingVehicle.id.startsWith("mock") ? "Editar Veículo" : "Adicionar Novo Veículo"}
        description="Forneça os detalhes do veículo."
        formId="vehicle-form"
        isSubmitting={isMutating}
        editingItem={editingVehicle && editingVehicle.id && !editingVehicle.id.startsWith("mock") ? editingVehicle : null}
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


"use client";

import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Construction, Tag, Layers, CalendarDays, CheckCircle, XCircle, AlertTriangle as AlertIconLI, User, Loader2, Users, FileText, Coins, HandCoins, CalendarClock, History, PackageOpen, Car, ShieldAlert, Trash2, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import type { Equipment, Customer } from "@/types";
import { EquipmentSchema, equipmentTypeOptions, operationalStatusOptions } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";


const FIRESTORE_EQUIPMENT_COLLECTION_NAME = "equipamentos";
const FIRESTORE_CUSTOMER_COLLECTION_NAME = "clientes";

const NO_CUSTOMER_FORM_VALUE = "";
const NO_CUSTOMER_SELECT_ITEM_VALUE = "_NO_CUSTOMER_SELECTED_";
const LOADING_CUSTOMERS_SELECT_ITEM_VALUE = "_LOADING_CUSTOMERS_";

const operationalStatusIcons: Record<typeof operationalStatusOptions[number], JSX.Element> = {
  Disponível: <CheckCircle className="h-4 w-4 text-green-500" />,
  Locada: <Package className="h-4 w-4 text-blue-500" />,
  'Em Manutenção': <ShieldAlert className="h-4 w-4 text-red-500" />,
  Sucata: <Trash2 className="h-4 w-4 text-red-500" />,
};

const parseNumericToNullOrNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

const predefinedBrandOptionsList = [
  "Toyota", "Hyster", "Yale", "Still", "Linde", "Clark", "Mitsubishi", "Nissan",
  "Komatsu", "Crown", "Raymond", "Doosan", "Hyundai", "Caterpillar",
  "Jungheinrich", "Hangcha", "Heli", "EP", "Outra"
];


async function fetchEquipment(): Promise<Equipment[]> {
  const q = query(collection(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME), orderBy("brand", "asc"), orderBy("model", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();

    const equipmentData: Equipment = {
      id: docSnap.id,
      brand: data.brand || "Marca Desconhecida",
      model: data.model || "Modelo Desconhecido",
      chassisNumber: data.chassisNumber || "N/A",
      equipmentType: (equipmentTypeOptions.includes(data.equipmentType as any) || typeof data.equipmentType === 'string') ? data.equipmentType : "Empilhadeira Contrabalançada GLP",
      manufactureYear: parseNumericToNullOrNumber(data.manufactureYear),
      operationalStatus: operationalStatusOptions.includes(data.operationalStatus as any) ? data.operationalStatus : "Disponível",
      customerId: data.customerId || null,

      towerOpenHeightMm: parseNumericToNullOrNumber(data.towerOpenHeightMm),
      towerClosedHeightMm: parseNumericToNullOrNumber(data.towerClosedHeightMm),
      nominalCapacityKg: parseNumericToNullOrNumber(data.nominalCapacityKg),

      batteryBoxWidthMm: parseNumericToNullOrNumber(data.batteryBoxWidthMm),
      batteryBoxHeightMm: parseNumericToNullOrNumber(data.batteryBoxHeightMm),
      batteryBoxDepthMm: parseNumericToNullOrNumber(data.batteryBoxDepthMm),

      monthlyRentalValue: parseNumericToNullOrNumber(data.monthlyRentalValue),
      hourMeter: parseNumericToNullOrNumber(data.hourMeter),
      notes: data.notes || null,
    };
    return equipmentData;
  });
}

async function fetchCustomers(): Promise<Customer[]> {
  const q = query(collection(db, FIRESTORE_CUSTOMER_COLLECTION_NAME), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Customer));
}

interface EquipmentClientPageProps {
  equipmentIdFromUrl?: string | null;
}

export function EquipmentClientPage({ equipmentIdFromUrl }: EquipmentClientPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [showCustomFields, setShowCustomFields] = useState({
    brand: false,
    equipmentType: false,
  });

  const form = useForm<z.infer<typeof EquipmentSchema>>({
    resolver: zodResolver(EquipmentSchema),
    defaultValues: {
      brand: "", model: "", chassisNumber: "", equipmentType: "Empilhadeira Contrabalançada GLP",
      operationalStatus: "Disponível", customerId: NO_CUSTOMER_FORM_VALUE,
      manufactureYear: new Date().getFullYear(),
      customBrand: "", customEquipmentType: "",
      towerOpenHeightMm: undefined, towerClosedHeightMm: undefined,
      nominalCapacityKg: undefined,
      batteryBoxWidthMm: undefined, batteryBoxHeightMm: undefined, batteryBoxDepthMm: undefined,
      notes: "", monthlyRentalValue: undefined, hourMeter: undefined,
    },
  });

  const customerIdValue = useWatch({ control: form.control, name: 'customerId' });
  const currentOperationalStatus = useWatch({ control: form.control, name: 'operationalStatus' });

  useEffect(() => {
    if (customerIdValue && customerIdValue !== NO_CUSTOMER_FORM_VALUE) {
      if (currentOperationalStatus !== 'Em Manutenção' && currentOperationalStatus !== 'Sucata') {
        form.setValue('operationalStatus', 'Locada');
      }
    } else if (currentOperationalStatus === 'Locada') {
      form.setValue('operationalStatus', 'Disponível');
    }
  }, [customerIdValue, currentOperationalStatus, form]);


  const { data: equipmentList = [], isLoading: isLoadingEquipment, isError: isErrorEquipment, error: errorEquipment } = useQuery<Equipment[], Error>({
    queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME],
    queryFn: fetchEquipment,
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[], Error>({
    queryKey: [FIRESTORE_CUSTOMER_COLLECTION_NAME],
    queryFn: fetchCustomers,
  });

  const openModal = useCallback((equipment?: Equipment) => {
    if (equipment) {
      setEditingEquipment(equipment);

      const isBrandPredefined = predefinedBrandOptionsList.includes(equipment.brand) && equipment.brand !== "Outra";
      const isEquipmentTypePredefined = equipmentTypeOptions.includes(equipment.equipmentType as any);


      const defaultValues = {
        ...equipment,
        model: equipment.model || "",
        brand: isBrandPredefined ? equipment.brand : '_CUSTOM_',
        customBrand: isBrandPredefined ? "" : (equipment.brand === "Outra" || equipment.brand === "_CUSTOM_" ? "" : equipment.brand),
        equipmentType: isEquipmentTypePredefined ? equipment.equipmentType : '_CUSTOM_',
        customEquipmentType: isEquipmentTypePredefined ? "" : equipment.equipmentType,
        customerId: equipment.customerId || NO_CUSTOMER_FORM_VALUE,
        manufactureYear: equipment.manufactureYear ?? new Date().getFullYear(),
        towerOpenHeightMm: equipment.towerOpenHeightMm ?? undefined,
        towerClosedHeightMm: equipment.towerClosedHeightMm ?? undefined,
        nominalCapacityKg: equipment.nominalCapacityKg ?? undefined,
        batteryBoxWidthMm: equipment.batteryBoxWidthMm ?? undefined,
        batteryBoxHeightMm: equipment.batteryBoxHeightMm ?? undefined,
        batteryBoxDepthMm: equipment.batteryBoxDepthMm ?? undefined,
        monthlyRentalValue: equipment.monthlyRentalValue ?? undefined,
        hourMeter: equipment.hourMeter ?? undefined,
        notes: equipment.notes || "",
      };
      form.reset(defaultValues);
      setShowCustomFields({
          brand: !isBrandPredefined,
          equipmentType: !isEquipmentTypePredefined,
      });

    } else {
      setEditingEquipment(null);
      form.reset({
        brand: "", model: "", chassisNumber: "", equipmentType: "Empilhadeira Contrabalançada GLP",
        operationalStatus: "Disponível", customerId: NO_CUSTOMER_FORM_VALUE,
        manufactureYear: new Date().getFullYear(),
        customBrand: "", customEquipmentType: "",
        towerOpenHeightMm: undefined, towerClosedHeightMm: undefined,
        nominalCapacityKg: undefined,
        batteryBoxWidthMm: undefined, batteryBoxHeightMm: undefined, batteryBoxDepthMm: undefined,
        notes: "", monthlyRentalValue: undefined, hourMeter: undefined,
      });
      setShowCustomFields({ brand: false, equipmentType: false });
    }
    setIsModalOpen(true);
  }, [form]);

  useEffect(() => {
    if (equipmentIdFromUrl && !isLoadingEquipment && equipmentList.length > 0) {
      const equipmentToEdit = equipmentList.find(eq => eq.id === equipmentIdFromUrl);
      if (equipmentToEdit) {
        openModal(equipmentToEdit);
        if (typeof window !== "undefined") {
           window.history.replaceState(null, '', '/equipment');
        }
      }
    }
  }, [equipmentIdFromUrl, equipmentList, isLoadingEquipment, openModal]);


  const prepareDataForFirestore = (formData: z.infer<typeof EquipmentSchema>): Omit<Equipment, 'id' | 'customBrand' | 'customEquipmentType'> => {
    const {
      customBrand, customEquipmentType,
      customerId: formCustomerId,
      ...restOfData
    } = formData;

    const parsedData = {
      ...restOfData,
      manufactureYear: parseNumericToNullOrNumber(restOfData.manufactureYear),
      towerOpenHeightMm: parseNumericToNullOrNumber(restOfData.towerOpenHeightMm),
      towerClosedHeightMm: parseNumericToNullOrNumber(restOfData.towerClosedHeightMm),
      nominalCapacityKg: parseNumericToNullOrNumber(restOfData.nominalCapacityKg),
      batteryBoxWidthMm: parseNumericToNullOrNumber(restOfData.batteryBoxWidthMm),
      batteryBoxHeightMm: parseNumericToNullOrNumber(restOfData.batteryBoxHeightMm),
      batteryBoxDepthMm: parseNumericToNullOrNumber(restOfData.batteryBoxDepthMm),
      monthlyRentalValue: parseNumericToNullOrNumber(restOfData.monthlyRentalValue),
      hourMeter: parseNumericToNullOrNumber(restOfData.hourMeter),
    };

    return {
      ...parsedData,
      brand: parsedData.brand === '_CUSTOM_' ? customBrand || "Não especificado" : parsedData.brand,
      model: parsedData.model,
      equipmentType: parsedData.equipmentType === '_CUSTOM_' ? customEquipmentType || "Não especificado" : parsedData.equipmentType,
      customerId: (formCustomerId === NO_CUSTOMER_FORM_VALUE || formCustomerId === null || formCustomerId === undefined) ? null : formCustomerId,
      notes: parsedData.notes || null,
    };
  };

  const addEquipmentMutation = useMutation({
    mutationFn: async (newEquipmentFormData: z.infer<typeof EquipmentSchema>) => {
      const equipmentDataForFirestore = prepareDataForFirestore(newEquipmentFormData);
      return addDoc(collection(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME), equipmentDataForFirestore);
    },
    onSuccess: (docRef, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Equipamento Criado", description: `${variables.brand} ${variables.model} adicionado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Criar", description: `Não foi possível criar ${variables.brand} ${variables.model}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async (equipmentDataToUpdate: { id: string } & z.infer<typeof EquipmentSchema>) => {
      const { id, ...formData } = equipmentDataToUpdate;
      if (!id) throw new Error("ID do equipamento é necessário para atualização.");
      const equipmentDataForFirestore = prepareDataForFirestore(formData);
      const equipmentRef = doc(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME, id);
      return updateDoc(equipmentRef, equipmentDataForFirestore);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Equipamento Atualizado", description: `${variables.brand} ${variables.model} atualizado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Atualizar", description: `Não foi possível atualizar ${variables.brand} ${variables.model}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      if (!equipmentId) throw new Error("ID do equipamento é necessário para exclusão.");
      return deleteDoc(doc(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME, equipmentId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Equipamento Excluído", description: "O equipamento foi excluído." });
      closeModal();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o equipamento. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    form.reset();
    setShowCustomFields({ brand: false, equipmentType: false });
  };

  const onSubmit = async (values: z.infer<typeof EquipmentSchema>) => {
    if (editingEquipment && editingEquipment.id) {
      updateEquipmentMutation.mutate({ ...values, id: editingEquipment.id });
    } else {
      addEquipmentMutation.mutate(values);
    }
  };

  const handleModalDeleteConfirm = () => {
    if (editingEquipment && editingEquipment.id) {
      if (window.confirm(`Tem certeza que deseja excluir o equipamento "${editingEquipment.brand} ${editingEquipment.model}"?`)) {
        deleteEquipmentMutation.mutate(editingEquipment.id);
      }
    }
  };

  const handleSelectChange = (field: 'brand' | 'equipmentType', value: string) => {
    form.setValue(field, value);
    setShowCustomFields(prev => ({ ...prev, [field]: value === '_CUSTOM_' }));
    if (value !== '_CUSTOM_') {
        form.setValue(field === 'brand' ? 'customBrand' : 'customEquipmentType', "");
    }
  };

  const isLoading = isLoadingEquipment || isLoadingCustomers;
  const isMutating = addEquipmentMutation.isPending || updateEquipmentMutation.isPending;

  if (isLoading && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando dados...</p>
      </div>
    );
  }

  if (isErrorEquipment) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertIconLI className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Equipamentos</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {errorEquipment?.message}</p>
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

      {equipmentList.length === 0 && !isLoadingEquipment ? (
        <DataTablePlaceholder
          icon={Construction}
          title="Nenhum Equipamento Registrado"
          description="Adicione seu primeiro equipamento para começar a rastrear."
          buttonLabel="Adicionar Equipamento"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipmentList.map((eq) => {
            const customer = eq.customerId ? customers.find(c => c.id === eq.customerId) : null;
            return (
            <Card
              key={eq.id}
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(eq)}
            >
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">{eq.brand} {eq.model}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" /> Chassi: {eq.chassisNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><Layers className="mr-2 h-4 w-4 text-primary" /> Tipo: {eq.equipmentType}</p>
                {eq.manufactureYear && <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" /> Ano: {eq.manufactureYear}</p>}
                <p className="flex items-center">
                  {operationalStatusIcons[eq.operationalStatus]} <span className="ml-2">Status: {eq.operationalStatus}</span>
                </p>
                {customer ? (
                  <p className="flex items-center">
                    <Users className="mr-2 h-4 w-4 text-primary" /> Cliente:
                    <Link
                      href={`/customers?openCustomerId=${eq.customerId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-primary hover:underline"
                      title={`Ver detalhes de ${customer.name}`}
                    >
                      {customer.name}
                    </Link>
                  </p>
                ) : eq.customerId ? (
                     <p className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground" /> Cliente: ID {eq.customerId} (Carregando...)</p>
                ): null}

                 {eq.hourMeter !== null && eq.hourMeter !== undefined && <p className="flex items-center"><History className="mr-2 h-4 w-4 text-primary" /> Horímetro: {eq.hourMeter}h</p>}
                 {eq.monthlyRentalValue !== null && eq.monthlyRentalValue !== undefined && <p className="flex items-center"><Coins className="mr-2 h-4 w-4 text-primary" /> Aluguel Mensal: R$ {eq.monthlyRentalValue.toFixed(2)}</p>}

              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
              </CardFooter>
            </Card>
          );
        })}
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
        onDeleteConfirm={editingEquipment ? handleModalDeleteConfirm : undefined}
        isDeleting={deleteEquipmentMutation.isPending}
        deleteButtonLabel="Excluir Equipamento"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="equipment-form" className="space-y-4">
            <h3 className="text-md font-semibold pt-2 border-b pb-1 font-headline">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <Select onValueChange={(value) => handleSelectChange('brand', value)} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione ou digite" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {predefinedBrandOptionsList.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                      <SelectItem value="_CUSTOM_">Digitar Marca...</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomFields.brand && (
                    <FormField control={form.control} name="customBrand" render={({ field: customField }) => (
                      <FormItem className="mt-2">
                        <FormControl><Input placeholder="Digite a marca" {...customField} value={customField.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl><Input placeholder="Ex: 8FGCU25, S25" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="chassisNumber" render={({ field }) => (
              <FormItem><FormLabel>Número do Chassi</FormLabel><FormControl><Input placeholder="Número único do chassi" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="equipmentType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Equipamento</FormLabel>
                  <Select onValueChange={(value) => handleSelectChange('equipmentType', value)} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {equipmentTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      <SelectItem value="_CUSTOM_">Digitar Tipo...</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomFields.equipmentType && (
                    <FormField control={form.control} name="customEquipmentType" render={({ field: customField }) => (
                     <FormItem className="mt-2">
                        <FormControl><Input placeholder="Digite o tipo" {...customField} value={customField.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="manufactureYear" render={({ field }) => (
                <FormItem><FormLabel>Ano de Fabricação</FormLabel><FormControl><Input type="number" placeholder="Ex: 2022" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="operationalStatus" render={({ field }) => (
                <FormItem><FormLabel>Status Operacional</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {operationalStatusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente Associado (Opcional)</FormLabel>
                  <Select
                    onValueChange={(selectedValue) => field.onChange(selectedValue === NO_CUSTOMER_SELECT_ITEM_VALUE ? null : selectedValue)}
                    value={field.value || NO_CUSTOMER_FORM_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingCustomers ? "Carregando clientes..." : "Selecione um cliente"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingCustomers ? (
                        <SelectItem value={LOADING_CUSTOMERS_SELECT_ITEM_VALUE} disabled>Carregando...</SelectItem>
                      ) : (
                        <>
                          <SelectItem value={NO_CUSTOMER_SELECT_ITEM_VALUE}>Nenhum</SelectItem>
                          {customers.map((cust) => (
                            <SelectItem key={cust.id} value={cust.id}>
                              {cust.name} ({cust.cnpj})
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Especificações Técnicas (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField control={form.control} name="towerOpenHeightMm" render={({ field }) => (
                <FormItem><FormLabel>Altura Torre Aberta (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="towerClosedHeightMm" render={({ field }) => (
                <FormItem><FormLabel>Altura Torre Fechada (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nominalCapacityKg" render={({ field }) => (
                <FormItem><FormLabel>Capacidade Nominal (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Dimensões Caixa de Bateria (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="batteryBoxWidthMm" render={({ field }) => (
                    <FormItem><FormLabel>Largura (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="batteryBoxHeightMm" render={({ field }) => (
                    <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="batteryBoxDepthMm" render={({ field }) => (
                    <FormItem><FormLabel>Profundidade (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>


            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Informações Adicionais (Opcional)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="hourMeter" render={({ field }) => (
                    <FormItem><FormLabel>Horímetro Atual (h)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="monthlyRentalValue" render={({ field }) => (
                    <FormItem><FormLabel>Valor Aluguel Mensal (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Detalhes adicionais, histórico, etc." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

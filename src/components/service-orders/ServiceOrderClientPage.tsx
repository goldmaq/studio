
"use client";

import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, ClipboardList, User, Construction, HardHat, Settings2, Calendar, FileText, Play, Pause, Check, AlertTriangle as AlertIconLI, X, Loader2, CarFront as VehicleIcon, UploadCloud, Link as LinkIcon, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ServiceOrder, Customer, Equipment, Technician, Vehicle } from "@/types";
import { ServiceOrderSchema, serviceTypeOptionsList } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const phaseOptions: ServiceOrder['phase'][] = ['Pendente', 'Em Progresso', 'Aguardando Peças', 'Concluída', 'Cancelada'];
const phaseIcons = {
  Pendente: <AlertIconLI className="h-4 w-4 text-yellow-400" />, 
  'Em Progresso': <Play className="h-4 w-4 text-blue-500" />,
  'Aguardando Peças': <Pause className="h-4 w-4 text-orange-500" />,
  Concluída: <Check className="h-4 w-4 text-green-500" />,
  Cancelada: <X className="h-4 w-4 text-red-500" />,
};

const FIRESTORE_COLLECTION_NAME = "ordensDeServico";
const FIRESTORE_CUSTOMER_COLLECTION_NAME = "clientes";
const FIRESTORE_EQUIPMENT_COLLECTION_NAME = "equipamentos";
const FIRESTORE_TECHNICIAN_COLLECTION_NAME = "tecnicos";
const FIRESTORE_VEHICLE_COLLECTION_NAME = "veiculos";

const NO_VEHICLE_SELECTED_VALUE = "_NO_VEHICLE_SELECTED_";
const LOADING_VEHICLES_SELECT_ITEM_VALUE = "_LOADING_VEHICLES_";
const CUSTOM_SERVICE_TYPE_VALUE = "_CUSTOM_";

const getFileNameFromUrl = (url: string): string => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const pathAndQuery = decodedUrl.split('?')[0];
    const segments = pathAndQuery.split('/');
    const fileNameWithPossiblePrefix = segments.pop() || "arquivo";
    const fileNameCleaned = fileNameWithPossiblePrefix.split('?')[0];
    const finalFileName = fileNameCleaned.substring(fileNameCleaned.indexOf('_') + 1);
    return finalFileName || "arquivo";
  } catch (e) {
    console.error("Error parsing filename from URL:", e);
    return "arquivo";
  }
};

async function uploadServiceOrderFile(
  file: File,
  orderId: string
): Promise<string> {
  const filePath = `service_order_media/${orderId}/${Date.now()}_${file.name}`;
  const fileStorageRef = storageRef(storage, filePath);
  await uploadBytes(fileStorageRef, file);
  return getDownloadURL(fileStorageRef);
}

async function deleteServiceOrderFileFromStorage(fileUrl?: string | null) {
  if (fileUrl) {
    try {
      const gcsPath = new URL(fileUrl).pathname.split('/o/')[1].split('?')[0];
      const decodedPath = decodeURIComponent(gcsPath);
      const fileStorageRef = storageRef(storage, decodedPath);
      await deleteObject(fileStorageRef);
    } catch (e) {
      console.warn(`[DELETE SO FILE] Failed to delete file from storage: ${fileUrl}`, e);
    }
  }
}


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
      vehicleId: data.vehicleId || null,
      mediaUrl: data.mediaUrl || null,
      serviceType: data.serviceType || "Não especificado",
      customServiceType: data.customServiceType || "",
    } as ServiceOrder;
  });
}

async function fetchCustomers(): Promise<Customer[]> {
  const q = query(collection(db, FIRESTORE_CUSTOMER_COLLECTION_NAME), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Customer));
}

async function fetchEquipment(): Promise<Equipment[]> {
  const q = query(collection(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME), orderBy("brand", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Equipment));
}

async function fetchTechnicians(): Promise<Technician[]> {
  const q = query(collection(db, FIRESTORE_TECHNICIAN_COLLECTION_NAME), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Technician));
}

async function fetchVehicles(): Promise<Vehicle[]> {
  const q = query(collection(db, FIRESTORE_VEHICLE_COLLECTION_NAME), orderBy("model", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Vehicle));
}

const getNextOrderNumber = (currentOrders: ServiceOrder[]): string => {
  let maxOrderNum = 3999; 
  currentOrders.forEach(order => {
    const num = parseInt(order.orderNumber, 10);
    if (!isNaN(num) && num > maxOrderNum) {
      maxOrderNum = num;
    }
  });
  return (maxOrderNum + 1).toString();
};

export function ServiceOrderClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [showCustomServiceType, setShowCustomServiceType] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const form = useForm<z.infer<typeof ServiceOrderSchema>>({
    resolver: zodResolver(ServiceOrderSchema),
    defaultValues: {
      orderNumber: "", customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
      serviceType: "", customServiceType: "", vehicleId: null, description: "", notes: "",
      startDate: formatDateForInput(new Date().toISOString()), endDate: "", mediaUrl: null
    },
  });

  const selectedCustomerId = useWatch({ control: form.control, name: 'customerId' });

  const { data: serviceOrders = [], isLoading: isLoadingServiceOrders, isError: isErrorServiceOrders, error: errorServiceOrders } = useQuery<ServiceOrder[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchServiceOrders,
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[], Error>({
    queryKey: [FIRESTORE_CUSTOMER_COLLECTION_NAME],
    queryFn: fetchCustomers,
  });

  const { data: equipmentList = [], isLoading: isLoadingEquipment } = useQuery<Equipment[], Error>({
    queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME],
    queryFn: fetchEquipment,
  });

  const { data: technicians = [], isLoading: isLoadingTechnicians } = useQuery<Technician[], Error>({
    queryKey: [FIRESTORE_TECHNICIAN_COLLECTION_NAME],
    queryFn: fetchTechnicians,
  });

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[], Error>({
    queryKey: [FIRESTORE_VEHICLE_COLLECTION_NAME],
    queryFn: fetchVehicles,
  });

  useEffect(() => {
    if (selectedCustomerId && customers.length > 0 && technicians.length > 0) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer?.preferredTechnician) {
        const preferredTech = technicians.find(t => t.name === customer.preferredTechnician);
        if (preferredTech) {
          form.setValue('technicianId', preferredTech.id, { shouldValidate: true });
        }
      }
    }
  }, [selectedCustomerId, customers, technicians, form]);

  const prepareDataForFirestore = (
    formData: z.infer<typeof ServiceOrderSchema>,
    newMediaUrl?: string | null
  ): Omit<ServiceOrder, 'id' | 'customServiceType'> => {
    const { customServiceType, ...restOfData } = formData;
    
    let finalServiceType = restOfData.serviceType;
    if (restOfData.serviceType === CUSTOM_SERVICE_TYPE_VALUE) {
      finalServiceType = customServiceType || "Não especificado";
    }

    return {
      ...restOfData,
      serviceType: finalServiceType,
      startDate: convertToTimestamp(restOfData.startDate),
      endDate: convertToTimestamp(restOfData.endDate),
      vehicleId: restOfData.vehicleId || null,
      mediaUrl: newMediaUrl === undefined ? formData.mediaUrl : newMediaUrl,
    };
  };


  const addServiceOrderMutation = useMutation({
    mutationFn: async (data: { formData: z.infer<typeof ServiceOrderSchema>, file: File | null }) => {
      setIsUploadingFile(true);
      const newOrderId = doc(collection(db, FIRESTORE_COLLECTION_NAME)).id;
      let uploadedMediaUrl: string | null = null;

      if (data.file) {
        uploadedMediaUrl = await uploadServiceOrderFile(data.file, newOrderId);
      }
      
      const orderDataForFirestore = prepareDataForFirestore(data.formData, uploadedMediaUrl);
      await setDoc(doc(db, FIRESTORE_COLLECTION_NAME, newOrderId), orderDataForFirestore);
      return { ...orderDataForFirestore, id: newOrderId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Ordem de Serviço Criada", description: `Ordem ${data.orderNumber} criada.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Criar OS", description: `Não foi possível criar a OS ${variables.formData.orderNumber}. Detalhe: ${err.message}`, variant: "destructive" });
    },
    onSettled: () => setIsUploadingFile(false)
  });

  const updateServiceOrderMutation = useMutation({
    mutationFn: async (data: { id: string, formData: z.infer<typeof ServiceOrderSchema>, file: File | null, currentOrder: ServiceOrder }) => {
      setIsUploadingFile(true);
      let newMediaUrl = data.currentOrder.mediaUrl;

      if (data.file) { 
        await deleteServiceOrderFileFromStorage(data.currentOrder.mediaUrl); 
        newMediaUrl = await uploadServiceOrderFile(data.file, data.id);
      }
      
      const orderDataForFirestore = prepareDataForFirestore(data.formData, newMediaUrl);
      const orderRef = doc(db, FIRESTORE_COLLECTION_NAME, data.id);
      await updateDoc(orderRef, orderDataForFirestore);
      return { ...orderDataForFirestore, id: data.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Ordem de Serviço Atualizada", description: `Ordem ${data.orderNumber} atualizada.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Atualizar OS", description: `Não foi possível atualizar a OS ${variables.formData.orderNumber}. Detalhe: ${err.message}`, variant: "destructive" });
    },
    onSettled: () => setIsUploadingFile(false)
  });
  
  const removeMediaFileMutation = useMutation({
    mutationFn: async (data: { orderId: string; fileUrl: string }) => {
      await deleteServiceOrderFileFromStorage(data.fileUrl);
      const orderRef = doc(db, FIRESTORE_COLLECTION_NAME, data.orderId);
      await updateDoc(orderRef, { mediaUrl: null });
      return { orderId: data.orderId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      if(editingOrder && editingOrder.id === data.orderId){
        setEditingOrder(prev => prev ? ({...prev, mediaUrl: null}) : null);
        form.setValue('mediaUrl', null);
      }
      toast({ title: "Arquivo Removido", description: "O arquivo de mídia foi removido." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Remover Arquivo", description: err.message, variant: "destructive" });
    }
  });


  const deleteServiceOrderMutation = useMutation({
    mutationFn: async (orderToDelete: ServiceOrder) => {
      if (!orderToDelete?.id) throw new Error("ID da OS é necessário para exclusão.");
      await deleteServiceOrderFileFromStorage(orderToDelete.mediaUrl); 
      return deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, orderToDelete.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Ordem de Serviço Excluída", description: `A OS foi excluída.` });
      closeModal(); 
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Excluir OS", description: `Não foi possível excluir a OS. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const openModal = useCallback((order?: ServiceOrder) => {
    setMediaFile(null);
    if (order) {
      setEditingOrder(order);
      const isServiceTypePredefined = serviceTypeOptionsList.includes(order.serviceType as any);
      form.reset({
        ...order,
        startDate: formatDateForInput(order.startDate),
        endDate: formatDateForInput(order.endDate),
        vehicleId: order.vehicleId || null, 
        mediaUrl: order.mediaUrl || null,
        serviceType: isServiceTypePredefined ? order.serviceType : CUSTOM_SERVICE_TYPE_VALUE,
        customServiceType: isServiceTypePredefined ? "" : order.serviceType,
      });
      setShowCustomServiceType(!isServiceTypePredefined);
    } else {
      setEditingOrder(null);
      const nextOrderNum = getNextOrderNumber(serviceOrders);
      form.reset({
        orderNumber: nextOrderNum, 
        customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
        serviceType: "", customServiceType: "", vehicleId: null, description: "", notes: "",
        startDate: formatDateForInput(new Date().toISOString()), endDate: "", mediaUrl: null
      });
      setShowCustomServiceType(false);
    }
    setIsModalOpen(true);
  }, [form, serviceOrders]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setMediaFile(null);
    form.reset();
    setShowCustomServiceType(false);
  };

  const onSubmit = async (values: z.infer<typeof ServiceOrderSchema>) => {
    if (editingOrder && editingOrder.id) {
      updateServiceOrderMutation.mutate({ id: editingOrder.id, formData: values, file: mediaFile, currentOrder: editingOrder });
    } else {
      addServiceOrderMutation.mutate({ formData: values, file: mediaFile });
    }
  };

  const handleModalDeleteConfirm = () => {
    if (editingOrder && editingOrder.id) {
       if (window.confirm(`Tem certeza que deseja excluir a Ordem de Serviço "${editingOrder.orderNumber}"?`)) {
        deleteServiceOrderMutation.mutate(editingOrder);
      }
    }
  };

  const handleMediaFileRemove = () => {
    if (editingOrder && editingOrder.id && editingOrder.mediaUrl) {
      if (window.confirm(`Tem certeza que deseja remover este arquivo de mídia?`)) {
        removeMediaFileMutation.mutate({ orderId: editingOrder.id, fileUrl: editingOrder.mediaUrl });
      }
    }
  };
  
  const handleServiceTypeChange = (value: string) => {
    form.setValue('serviceType', value);
    setShowCustomServiceType(value === CUSTOM_SERVICE_TYPE_VALUE);
    if (value !== CUSTOM_SERVICE_TYPE_VALUE) {
      form.setValue('customServiceType', "");
    }
  };

  const isMutating = addServiceOrderMutation.isPending || updateServiceOrderMutation.isPending || isUploadingFile || removeMediaFileMutation.isPending;
  const isLoadingPageData = isLoadingServiceOrders || isLoadingCustomers || isLoadingEquipment || isLoadingTechnicians || isLoadingVehicles;

  if (isLoadingPageData && !isModalOpen) { 
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando dados...</p>
      </div>
    );
  }
  
  if (isErrorServiceOrders) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertIconLI className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Ordens de Serviço</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {errorServiceOrders?.message}</p>
      </div>
    );
  }

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;
  const getEquipmentIdentifier = (id: string) => {
    const eq = equipmentList.find(e => e.id === id);
    return eq ? `${eq.brand} ${eq.model}` : id;
  };
  const getTechnicianName = (id: string) => technicians.find(t => t.id === id)?.name || id;
  const getVehicleIdentifier = (id?: string | null) => {
    if (!id) return "N/A";
    const vehicle = vehicles.find(v => v.id === id);
    return vehicle ? `${vehicle.model} (${vehicle.licensePlate})` : id;
  };


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

      {serviceOrders.length === 0 && !isLoadingServiceOrders ? (
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
                <CardTitle className="font-headline text-xl text-primary">OS: {order.orderNumber}</CardTitle>
                <CardDescription className="flex items-center text-sm pt-1">
                  {phaseIcons[order.phase]} <span className="font-medium text-muted-foreground ml-1 mr-1">Fase:</span> {order.phase}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Cliente:</span> {isLoadingCustomers ? 'Carregando...' : getCustomerName(order.customerId)}</p>
                <p className="flex items-center text-sm"><Construction className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Equip.:</span> {isLoadingEquipment ? 'Carregando...' : getEquipmentIdentifier(order.equipmentId)}</p>
                <p className="flex items-center text-sm"><HardHat className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Técnico:</span> {isLoadingTechnicians ? 'Carregando...' : getTechnicianName(order.technicianId)}</p>
                {order.vehicleId && <p className="flex items-center text-sm"><VehicleIcon className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Veículo:</span> {isLoadingVehicles ? 'Carregando...' : getVehicleIdentifier(order.vehicleId)}</p>}
                <p className="flex items-center text-sm"><Settings2 className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Tipo Serviço:</span> {order.serviceType}</p>
                {order.startDate && <p className="flex items-center text-sm"><Calendar className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Início:</span> {formatDateForInput(order.startDate)}</p>}
                {order.endDate && <p className="flex items-center text-sm"><Calendar className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Conclusão Prev.:</span> {formatDateForInput(order.endDate)}</p>}
                <p className="flex items-start text-sm"><FileText className="mr-2 mt-0.5 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Problema Relatado:</span> <span className="whitespace-pre-wrap break-words">{order.description}</span></p>
                {order.notes && <p className="flex items-start text-sm"><FileText className="mr-2 mt-0.5 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Obs.:</span> <span className="whitespace-pre-wrap break-words">{order.notes}</span></p>}
                {order.mediaUrl && (
                  <p className="flex items-center text-sm">
                    <LinkIcon className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium text-muted-foreground mr-1">Mídia:</span>
                    <a
                      href={order.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-primary hover:underline hover:text-primary/80 transition-colors truncate"
                      title={`Ver Mídia: ${getFileNameFromUrl(order.mediaUrl)}`}
                    >
                      {getFileNameFromUrl(order.mediaUrl)}
                    </a>
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
                <FormItem>
                  <FormLabel>Número da Ordem</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Gerado automaticamente" 
                      {...field} 
                      readOnly 
                    />
                  </FormControl>
                  <FormDescription>Este número é gerado automaticamente.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger>
                      <SelectValue placeholder={isLoadingCustomers ? "Carregando..." : "Selecione o Cliente"} />
                    </SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingCustomers ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : 
                       customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="equipmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger>
                      <SelectValue placeholder={isLoadingEquipment ? "Carregando..." : "Selecione o Equipamento"} />
                    </SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingEquipment ? <SelectItem value="loading" disabled>Carregando...</SelectItem> :
                       equipmentList.map(eq => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.brand} {eq.model} (Chassi: {eq.chassisNumber})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
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
                <FormItem>
                  <FormLabel>Técnico</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger>
                      <SelectValue placeholder={isLoadingTechnicians ? "Carregando..." : "Atribuir Técnico"} />
                    </SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingTechnicians ? <SelectItem value="loading" disabled>Carregando...</SelectItem> :
                       technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Serviço</FormLabel>
                  <Select onValueChange={handleServiceTypeChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {serviceTypeOptionsList.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      <SelectItem value={CUSTOM_SERVICE_TYPE_VALUE}>Outro (Especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomServiceType && (
                    <FormField control={form.control} name="customServiceType" render={({ field: customField }) => (
                     <FormItem className="mt-2">
                        <FormControl><Input placeholder="Digite o tipo de serviço" {...customField} value={customField.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormMessage />
                </FormItem>
              )} />


              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo (Opcional)</FormLabel>
                  <Select
                    onValueChange={(selectedValue) => field.onChange(selectedValue === NO_VEHICLE_SELECTED_VALUE ? null : selectedValue)}
                    value={field.value ?? NO_VEHICLE_SELECTED_VALUE}
                  >
                    <FormControl><SelectTrigger>
                      <SelectValue placeholder={isLoadingVehicles ? "Carregando..." : "Selecione o Veículo"} />
                    </SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingVehicles ? (
                        <SelectItem value={LOADING_VEHICLES_SELECT_ITEM_VALUE} disabled>Carregando...</SelectItem>
                       ) : (
                        <>
                          <SelectItem value={NO_VEHICLE_SELECTED_VALUE}>Nenhum</SelectItem>
                          {vehicles.map(vehicle => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.model} ({vehicle.licensePlate})</SelectItem>
                          ))}
                        </>
                       )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Conclusão (Prevista)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Problema Relatado</FormLabel><FormControl><Textarea placeholder="Descreva o problema relatado pelo cliente ou identificado" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormItem>
              <FormLabel>Mídia (Foto/Vídeo - Opcional)</FormLabel>
              {editingOrder?.mediaUrl && !mediaFile && (
                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <a href={editingOrder.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <LinkIcon className="h-3 w-3"/> Ver Mídia: {getFileNameFromUrl(editingOrder.mediaUrl)}
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={handleMediaFileRemove} className="text-destructive hover:text-destructive">
                    <XCircle className="h-4 w-4 mr-1"/> Remover
                  </Button>
                </div>
              )}
              <FormControl>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setMediaFile(e.target.files ? e.target.files[0] : null)}
                  className="mt-1"
                />
              </FormControl>
              {mediaFile && <FormDescription>Novo arquivo selecionado: {mediaFile.name}</FormDescription>}
              <FormMessage />
            </FormItem>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Observações adicionais, peças utilizadas, etc." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}


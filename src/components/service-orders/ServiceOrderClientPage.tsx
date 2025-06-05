
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, ClipboardList, User, Construction, HardHat, Settings2, Calendar, FileText, Play, Pause, Check, AlertTriangle as AlertIconLI, X, Loader2, CarFront as VehicleIcon, UploadCloud, Link as LinkIcon, XCircle, AlertTriangle, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ServiceOrder, Customer, Equipment, Technician, Vehicle, CompanyId } from "@/types";
import { ServiceOrderSchema, serviceTypeOptionsList, companyIds } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy, setDoc, DocumentData } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isBefore, isToday, addDays, parseISO, isValid, format } from 'date-fns';
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label";


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
const NO_EQUIPMENT_SELECTED_VALUE = "_NO_EQUIPMENT_SELECTED_";
const LOADING_EQUIPMENT_SELECT_ITEM_VALUE = "_LOADING_EQUIPMENT_";


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
  await uploadBytes(fileStorageRef, fileStorageRef);
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
  let d: Date;
  if (date instanceof Timestamp) {
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = parseISO(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return "";
  }
  if (!isValid(d)) return "";
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const localDate = new Date(year, month, day);
  return localDate.toISOString().split('T')[0];
};

const convertToTimestamp = (dateString?: string | null): Timestamp | null => {
  if (!dateString) return null;
  const date = parseISO(dateString);
  if (!isValid(date)) return null;
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return Timestamp.fromDate(utcDate);
};

async function fetchServiceOrders(): Promise<ServiceOrder[]> {
  const q = query(collection(db, FIRESTORE_COLLECTION_NAME), orderBy("startDate", "desc"), orderBy("orderNumber", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data() as DocumentData; // Cast to DocumentData for explicit access
    return {
      id: docSnap.id,
      orderNumber: data.orderNumber || "", // Provide default or ensure it's always there
      customerId: data.customerId || "",   // Provide default
      equipmentId: data.equipmentId || "", // Provide default
      phase: (phaseOptions.includes(data.phase) ? data.phase : "Pendente") as ServiceOrder['phase'], // Validate and provide default
      technicianId: data.technicianId || "", // Provide default
      description: data.description || "", // Provide default
      serviceType: data.serviceType || "Não especificado",
      customServiceType: data.customServiceType || "",
      vehicleId: data.vehicleId || null,
      startDate: data.startDate ? formatDateForInput(data.startDate) : undefined,
      endDate: data.endDate ? formatDateForInput(data.endDate) : undefined,
      notes: data.notes || "",
      mediaUrl: data.mediaUrl || null,
      technicalConclusion: data.technicalConclusion || null,
    } as ServiceOrder; // Assert as ServiceOrder after explicit mapping
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
  let maxOrderNum = 3999; // Start check from one less than desired start
  currentOrders.forEach(order => {
    if (order.orderNumber) {
        const num = parseInt(order.orderNumber, 10);
        if (!isNaN(num) && num > maxOrderNum) {
        maxOrderNum = num;
        }
    }
  });
  return (maxOrderNum + 1).toString();
};

type DeadlineStatus = 'overdue' | 'due_today' | 'due_soon' | 'none';

const getDeadlineStatusInfo = (
  endDateString?: string,
  phase?: ServiceOrder['phase']
): { status: DeadlineStatus; message?: string; icon?: JSX.Element } => {
  if (!endDateString || phase === 'Concluída' || phase === 'Cancelada') {
    return { status: 'none' };
  }

  const endDate = parseISO(endDateString);
  if (!isValid(endDate)) {
    return { status: 'none' };
  }
  const today = new Date();
  today.setHours(0,0,0,0);

  const endDateNormalized = new Date(endDate.valueOf());
  endDateNormalized.setHours(0,0,0,0);


  if (isBefore(endDateNormalized, today)) {
    return { status: 'overdue', message: 'Atrasada!', icon: <AlertTriangle className="h-4 w-4 text-red-500" /> };
  }
  if (isToday(endDateNormalized)) {
    return { status: 'due_today', message: 'Vence Hoje!', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> };
  }
  const twoDaysFromNow = addDays(today, 2);
  if (isBefore(endDateNormalized, twoDaysFromNow) || isToday(endDateNormalized)) {
     return { status: 'due_soon', message: 'Vence em Breve', icon: <AlertTriangle className="h-4 w-4 text-yellow-400" /> };
  }
  return { status: 'none' };
};


export function ServiceOrderClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [showCustomServiceType, setShowCustomServiceType] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isConclusionModalOpen, setIsConclusionModalOpen] = useState(false);
  const [technicalConclusionText, setTechnicalConclusionText] = useState("");


  const form = useForm<z.infer<typeof ServiceOrderSchema>>({
    resolver: zodResolver(ServiceOrderSchema),
    defaultValues: {
      orderNumber: "", customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
      serviceType: "", customServiceType: "", vehicleId: null, description: "", notes: "",
      startDate: formatDateForInput(new Date().toISOString()), endDate: "", mediaUrl: null, technicalConclusion: null,
    },
  });

  const selectedCustomerId = useWatch({ control: form.control, name: 'customerId' });
  const selectedEquipmentId = useWatch({ control: form.control, name: 'equipmentId' });

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

  const filteredEquipmentList = useMemo(() => {
    if (isLoadingEquipment) return [];
    if (selectedCustomerId) {
      return equipmentList.filter(eq =>
        eq.customerId === selectedCustomerId ||
        (companyIds.includes(eq.ownerReference as CompanyId) && (eq.operationalStatus === "Disponível" || eq.operationalStatus === "Em Manutenção"))
      );
    }
    return equipmentList.filter(eq =>
      companyIds.includes(eq.ownerReference as CompanyId) && (eq.operationalStatus === "Disponível" || eq.operationalStatus === "Em Manutenção")
    );
  }, [equipmentList, selectedCustomerId, isLoadingEquipment]);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer?.preferredTechnician) {
        const preferredTech = technicians.find(t => t.name === customer.preferredTechnician);
        if (preferredTech) {
          form.setValue('technicianId', preferredTech.id, { shouldValidate: true });
        }
      }
      if (selectedEquipmentId && !filteredEquipmentList.find(eq => eq.id === selectedEquipmentId)) {
        form.setValue('equipmentId', "", { shouldValidate: true });
      }
    } else {
       if (selectedEquipmentId && !filteredEquipmentList.find(eq => eq.id === selectedEquipmentId)) {
        form.setValue('equipmentId', "", { shouldValidate: true });
      }
    }
  }, [selectedCustomerId, customers, technicians, form, filteredEquipmentList, selectedEquipmentId]);


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
      technicalConclusion: restOfData.technicalConclusion || null,
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

  const concludeServiceOrderMutation = useMutation({
    mutationFn: async (data: { orderId: string; conclusionText: string; currentEndDate?: string | null }) => {
      const orderRef = doc(db, FIRESTORE_COLLECTION_NAME, data.orderId);
      let finalEndDate = convertToTimestamp(data.currentEndDate);
      if (!finalEndDate) {
        finalEndDate = Timestamp.now();
      }
      await updateDoc(orderRef, {
        phase: "Concluída",
        technicalConclusion: data.conclusionText,
        endDate: finalEndDate,
      });
      return data.orderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Ordem de Serviço Concluída", description: `A OS foi marcada como concluída.` });
      setIsConclusionModalOpen(false);
      closeModal(); // Fecha o modal principal também
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Concluir OS", description: `Não foi possível concluir a OS. Detalhe: ${err.message}`, variant: "destructive" });
    },
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
        technicalConclusion: order.technicalConclusion || null,
      });
      setShowCustomServiceType(!isServiceTypePredefined);
    } else {
      setEditingOrder(null);
      const nextOrderNum = getNextOrderNumber(serviceOrders);
      form.reset({
        orderNumber: nextOrderNum,
        customerId: "", equipmentId: "", phase: "Pendente", technicianId: "",
        serviceType: "", customServiceType: "", vehicleId: null, description: "", notes: "",
        startDate: formatDateForInput(new Date().toISOString()), endDate: "", mediaUrl: null, technicalConclusion: null,
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
    setIsConclusionModalOpen(false);
    setTechnicalConclusionText("");
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

  const handleOpenConclusionModal = () => {
    if (editingOrder) {
      setTechnicalConclusionText(editingOrder.technicalConclusion || "");
      setIsConclusionModalOpen(true);
    }
  };

  const handleFinalizeConclusion = () => {
    if (editingOrder && editingOrder.id) {
      if (!technicalConclusionText.trim()) {
        toast({ title: "Campo Obrigatório", description: "A conclusão técnica não pode estar vazia.", variant: "destructive"});
        return;
      }
      concludeServiceOrderMutation.mutate({
        orderId: editingOrder.id,
        conclusionText: technicalConclusionText,
        currentEndDate: editingOrder.endDate,
      });
    }
  };

  const isOrderConcludedOrCancelled = editingOrder?.phase === 'Concluída' || editingOrder?.phase === 'Cancelada';
  const isMutating = addServiceOrderMutation.isPending || updateServiceOrderMutation.isPending || isUploadingFile || removeMediaFileMutation.isPending || concludeServiceOrderMutation.isPending;
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
    return eq ? `${eq.brand} ${eq.model} (Chassi: ${eq.chassisNumber})` : id;
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
          {serviceOrders.map((order) => {
            const deadlineInfo = getDeadlineStatusInfo(order.endDate, order.phase);
            const cardClasses = cn("flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer", {
              "border-red-500 border-2": deadlineInfo.status === 'overdue',
              "border-yellow-500 border-2": deadlineInfo.status === 'due_today' || deadlineInfo.status === 'due_soon',
            });

            return (
            <Card
              key={order.id}
              className={cardClasses}
              onClick={() => openModal(order)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="font-headline text-xl text-primary">OS: {order.orderNumber}</CardTitle>
                  {deadlineInfo.icon && (
                    <div title={deadlineInfo.message}>
                      {deadlineInfo.icon}
                    </div>
                  )}
                </div>
                <CardDescription className="flex items-center text-sm pt-1">
                  {phaseIcons[order.phase]} <span className="font-medium text-muted-foreground ml-1 mr-1">Fase:</span> {order.phase}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><User className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Cliente:</span> {isLoadingCustomers ? 'Carregando...' : getCustomerName(order.customerId)}</p>
                <p className="flex items-center"><Construction className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Equip.:</span> {isLoadingEquipment ? 'Carregando...' : getEquipmentIdentifier(order.equipmentId)}</p>
                <p className="flex items-center"><HardHat className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Técnico:</span> {isLoadingTechnicians ? 'Carregando...' : getTechnicianName(order.technicianId)}</p>
                {order.vehicleId && <p className="flex items-center"><VehicleIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Veículo:</span> {isLoadingVehicles ? 'Carregando...' : getVehicleIdentifier(order.vehicleId)}</p>}
                <p className="flex items-center"><Settings2 className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Tipo Serviço:</span> {order.serviceType}</p>
                {order.startDate && <p className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Início:</span> {format(parseISO(order.startDate), 'dd/MM/yyyy')}</p>}
                {order.endDate && <p className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Conclusão Prev.:</span> {format(parseISO(order.endDate), 'dd/MM/yyyy')}</p>}
                <p className="flex items-start"><FileText className="mr-2 mt-0.5 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Problema Relatado:</span> <span className="whitespace-pre-wrap break-words">{order.description}</span></p>
                {order.technicalConclusion && <p className="flex items-start"><Check className="mr-2 mt-0.5 h-4 w-4 text-green-500 flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Conclusão Técnica:</span> <span className="whitespace-pre-wrap break-words">{order.technicalConclusion}</span></p>}
                {order.notes && <p className="flex items-start"><FileText className="mr-2 mt-0.5 h-4 w-4 text-primary flex-shrink-0" /> <span className="font-medium text-muted-foreground mr-1">Obs.:</span> <span className="whitespace-pre-wrap break-words">{order.notes}</span></p>}
                {order.mediaUrl && (
                  <p className="flex items-center">
                    <LinkIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
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
          )})}
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
            <fieldset disabled={isOrderConcludedOrCancelled && editingOrder?.phase !== 'Cancelada'}>
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
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isOrderConcludedOrCancelled}>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || NO_EQUIPMENT_SELECTED_VALUE}
                      disabled={isOrderConcludedOrCancelled}
                    >
                      <FormControl><SelectTrigger>
                        <SelectValue placeholder={isLoadingEquipment ? "Carregando..." : "Selecione o Equipamento"} />
                      </SelectTrigger></FormControl>
                      <SelectContent>
                        {isLoadingEquipment ? (
                          <SelectItem value={LOADING_EQUIPMENT_SELECT_ITEM_VALUE} disabled>Carregando...</SelectItem>
                         ) : filteredEquipmentList.length === 0 ? (
                          <SelectItem value={NO_EQUIPMENT_SELECTED_VALUE} disabled>
                            {selectedCustomerId ? "Nenhum equipamento para este cliente ou disponível na frota" : "Nenhum equipamento da frota disponível/em manutenção"}
                          </SelectItem>
                         ) : (
                          <>
                            <SelectItem value={NO_EQUIPMENT_SELECTED_VALUE}>Selecione um equipamento</SelectItem>
                            {filteredEquipmentList.map(eq => (
                              <SelectItem key={eq.id} value={eq.id}>{eq.brand} {eq.model} (Chassi: {eq.chassisNumber})</SelectItem>
                            ))}
                          </>
                         )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phase" render={({ field }) => (
                  <FormItem><FormLabel>Fase</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isOrderConcludedOrCancelled}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione a fase" /></SelectTrigger></FormControl>
                      <SelectContent>{phaseOptions.map(opt => <SelectItem key={opt} value={opt} disabled={opt === 'Concluída'}>{opt}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="technicianId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isOrderConcludedOrCancelled}>
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
                    <Select onValueChange={handleServiceTypeChange} value={field.value} disabled={isOrderConcludedOrCancelled}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {serviceTypeOptionsList.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        <SelectItem value={CUSTOM_SERVICE_TYPE_VALUE}>Outro (Especificar)</SelectItem>
                      </SelectContent>
                    </Select>
                    {showCustomServiceType && (
                      <FormField control={form.control} name="customServiceType" render={({ field: customField }) => (
                       <FormItem className="mt-2">
                          <FormControl><Input placeholder="Digite o tipo de serviço" {...customField} value={customField.value ?? ""} disabled={isOrderConcludedOrCancelled} /></FormControl>
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
                      disabled={isOrderConcludedOrCancelled}
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
                  <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} disabled={isOrderConcludedOrCancelled} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel>Data de Conclusão (Prevista)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} disabled={isOrderConcludedOrCancelled} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Problema Relatado</FormLabel><FormControl><Textarea placeholder="Descreva o problema relatado pelo cliente ou identificado" {...field} disabled={isOrderConcludedOrCancelled} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormItem>
                <FormLabel>Mídia (Foto/Vídeo - Opcional)</FormLabel>
                {editingOrder?.mediaUrl && !mediaFile && (
                  <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <a href={editingOrder.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <LinkIcon className="h-3 w-3"/> Ver Mídia: {getFileNameFromUrl(editingOrder.mediaUrl)}
                    </a>
                    {!isOrderConcludedOrCancelled && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleMediaFileRemove} className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4 mr-1"/> Remover
                      </Button>
                    )}
                  </div>
                )}
                {!isOrderConcludedOrCancelled && (
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setMediaFile(e.target.files ? e.target.files[0] : null)}
                      className="mt-1"
                      disabled={isOrderConcludedOrCancelled}
                    />
                  </FormControl>
                )}
                {mediaFile && <FormDescription>Novo arquivo selecionado: {mediaFile.name}</FormDescription>}
                <FormMessage />
              </FormItem>
            </fieldset>

            {/* Campos editáveis mesmo se concluída/cancelada */}
            <FormField control={form.control} name="technicalConclusion" render={({ field }) => (
              <FormItem>
                <FormLabel>Conclusão Técnica</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={isOrderConcludedOrCancelled ? (field.value ? "" : "Nenhuma conclusão técnica registrada.") : "Será preenchido ao concluir a OS."}
                    {...field}
                    value={field.value ?? ""}
                    readOnly={!isOrderConcludedOrCancelled && editingOrder?.phase !== 'Cancelada'} 
                    disabled={!isOrderConcludedOrCancelled && editingOrder?.phase !== 'Cancelada'}
                    rows={3}
                  />
                </FormControl>
                 {!isOrderConcludedOrCancelled && editingOrder?.phase !== 'Cancelada' && <FormDescription>Este campo será habilitado ao concluir a OS.</FormDescription>}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Observações adicionais, peças utilizadas, etc." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            
            {/* Botões de Ação no Rodapé do FormModal são gerenciados pelo FormModal */}
            {/* A lógica de submit está no form e o FormModal provê os botões */}
            {/* O botão de concluir OS precisa ser adicionado aqui dentro do form para ter acesso ao contexto ou ter sua lógica separada */}
             <div className="hidden">
                <Button type="submit" form="service-order-form" id="hidden-submit-button" />
            </div>
          </form>
        </Form>
         <DialogFooter className="gap-2 sm:justify-between pt-4 border-t mt-4">
            <div>
                {editingOrder && !isOrderConcludedOrCancelled && editingOrder.phase !== 'Cancelada' && (
                    <Button type="button" variant="outline" onClick={handleOpenConclusionModal} disabled={isMutating}>
                        <Check className="mr-2 h-4 w-4" /> Concluir OS
                    </Button>
                )}
            </div>
            <div className="flex gap-2 justify-end">
                 <Button variant="ghost" onClick={closeModal} disabled={isMutating}>
                    Cancelar
                </Button>
                <Button 
                    type="button" 
                    onClick={() => document.getElementById('hidden-submit-button')?.click()} 
                    disabled={isMutating} 
                    className="bg-primary hover:bg-primary/90"
                >
                    {isMutating ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingOrder ? "Salvar Alterações" : "Criar OS"}
                </Button>
            </div>
        </DialogFooter>
      </FormModal>

      {/* AlertDialog para Conclusão Técnica */}
      <AlertDialog open={isConclusionModalOpen} onOpenChange={setIsConclusionModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Ordem de Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, forneça a conclusão técnica para esta Ordem de Serviço. Esta ação marcará a OS como "Concluída".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="technical-conclusion-input" className="text-sm font-medium">
              Conclusão Técnica
            </Label>
            <Textarea
              id="technical-conclusion-input"
              value={technicalConclusionText}
              onChange={(e) => setTechnicalConclusionText(e.target.value)}
              placeholder="Descreva a solução aplicada, peças trocadas, e o estado final do equipamento."
              rows={5}
              className="mt-1"
            />
            {concludeServiceOrderMutation.isError && (
                <p className="text-sm text-destructive mt-2">
                    Erro: {(concludeServiceOrderMutation.error as Error)?.message || "Não foi possível concluir a OS."}
                </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConclusionModalOpen(false)} disabled={concludeServiceOrderMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizeConclusion} disabled={concludeServiceOrderMutation.isPending || !technicalConclusionText.trim()}>
              {concludeServiceOrderMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 h-4 w-4" />}
              Finalizar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
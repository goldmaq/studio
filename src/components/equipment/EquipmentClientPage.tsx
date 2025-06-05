
"use client";

import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Construction, Tag, Layers, CalendarDays, CheckCircle, User, Loader2, Users, FileText, Coins, Package, ShieldAlert, Trash2, AlertTriangle as AlertIconLI, UploadCloud, BookOpen, AlertCircle, Link as LinkIcon, XCircle, Building, UserCog, ArrowUpFromLine, ArrowDownToLine, Timer } from "lucide-react"; // Added tower and timer icons
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import type { Equipment, Customer, CompanyId, OwnerReferenceType } from "@/types";
import { EquipmentSchema, equipmentTypeOptions, operationalStatusOptions, companyDisplayOptions, OWNER_REF_CUSTOMER, companyIds } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import React from 'react';


const FIRESTORE_EQUIPMENT_COLLECTION_NAME = "equipamentos";
const FIRESTORE_CUSTOMER_COLLECTION_NAME = "clientes";

const NO_CUSTOMER_SELECT_ITEM_VALUE = "_NO_CUSTOMER_SELECTED_";
const LOADING_CUSTOMERS_SELECT_ITEM_VALUE = "_LOADING_CUSTOMERS_";
const NO_OWNER_REFERENCE_VALUE = "_NOT_SPECIFIED_";


const operationalStatusIcons: Record<typeof operationalStatusOptions[number], JSX.Element> = {
  Disponível: <CheckCircle className="h-4 w-4 text-green-500" />, // Use green-500 for Disponível
  Locada: <Package className="h-4 w-4 text-blue-500" />,
  'Em Manutenção': <ShieldAlert className="h-4 w-4 text-yellow-500" />, // Use yellow-500 for Em Manutenção
  Sucata: <Trash2 className="h-4 w-4 text-red-500" />, // Use red-500 for Sucata
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

async function uploadFile(
  file: File,
  equipmentId: string,
  fileTypePrefix: 'partsCatalog' | 'errorCodes'
): Promise<string> {
  const filePath = `equipment_files/${equipmentId}/${fileTypePrefix}_${file.name}`;
  const fileStorageRef = storageRef(storage, filePath);
  await uploadBytes(fileStorageRef, file);
  return getDownloadURL(fileStorageRef);
}

async function deleteFileFromStorage(fileUrl?: string | null) {
  if (fileUrl) {
    try {
      const gcsPath = new URL(fileUrl).pathname.split('/o/')[1].split('?')[0];
      const decodedPath = decodeURIComponent(gcsPath);
      const fileStorageRef = storageRef(storage, decodedPath);
      await deleteObject(fileStorageRef);
    } catch (e) {
      console.warn(`[DELETE FILE] Failed to delete file from storage: ${fileUrl}`, e);
    }
  }
}


async function fetchEquipment(): Promise<Equipment[]> {
  const q = query(collection(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME), orderBy("brand", "asc"), orderBy("model", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      brand: data.brand || "Marca Desconhecida",
      model: data.model || "Modelo Desconhecido",
      chassisNumber: data.chassisNumber || "N/A",
      equipmentType: (equipmentTypeOptions.includes(data.equipmentType as any) || typeof data.equipmentType === 'string') ? data.equipmentType : "Empilhadeira Contrabalançada GLP",
      manufactureYear: parseNumericToNullOrNumber(data.manufactureYear),
      operationalStatus: operationalStatusOptions.includes(data.operationalStatus as any) ? data.operationalStatus : "Disponível",
      customerId: data.customerId || null,
      ownerReference: data.ownerReference || null,
      towerOpenHeightMm: parseNumericToNullOrNumber(data.towerOpenHeightMm),
      towerClosedHeightMm: parseNumericToNullOrNumber(data.towerClosedHeightMm),
      nominalCapacityKg: parseNumericToNullOrNumber(data.nominalCapacityKg),
      batteryBoxWidthMm: parseNumericToNullOrNumber(data.batteryBoxWidthMm),
      batteryBoxHeightMm: parseNumericToNullOrNumber(data.batteryBoxHeightMm),
      batteryBoxDepthMm: parseNumericToNullOrNumber(data.batteryBoxDepthMm),
      monthlyRentalValue: parseNumericToNullOrNumber(data.monthlyRentalValue),
      hourMeter: parseNumericToNullOrNumber(data.hourMeter),
      notes: data.notes || null,
      partsCatalogUrl: data.partsCatalogUrl || null,
      errorCodesUrl: data.errorCodesUrl || null,
    } as Equipment;
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
  const [partsCatalogFile, setPartsCatalogFile] = useState<File | null>(null);
  const [errorCodesFile, setErrorCodesFile] = useState<File | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);


  const [showCustomFields, setShowCustomFields] = useState({
    brand: false,
    equipmentType: false,
  });

  const form = useForm<z.infer<typeof EquipmentSchema>>({
    resolver: zodResolver(EquipmentSchema),
    defaultValues: {
      brand: "", model: "", chassisNumber: "", equipmentType: "Empilhadeira Contrabalançada GLP",
      operationalStatus: "Disponível", customerId: null, 
      ownerReference: null, 
      manufactureYear: new Date().getFullYear(),
      customBrand: "", customEquipmentType: "",
      towerOpenHeightMm: undefined, towerClosedHeightMm: undefined,
      nominalCapacityKg: undefined,
      batteryBoxWidthMm: undefined, batteryBoxHeightMm: undefined, batteryBoxDepthMm: undefined,
      notes: "", monthlyRentalValue: undefined, hourMeter: undefined,
      partsCatalogUrl: null, errorCodesUrl: null,
    },
  });


  const { data: equipmentList = [], isLoading: isLoadingEquipment, isError: isErrorEquipment, error: errorEquipment } = useQuery<Equipment[], Error>({
    queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME],
    queryFn: fetchEquipment,
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[], Error>({
    queryKey: [FIRESTORE_CUSTOMER_COLLECTION_NAME],
    queryFn: fetchCustomers,
  });

  const openModal = useCallback((equipment?: Equipment) => {
    setPartsCatalogFile(null);
    setErrorCodesFile(null);
    if (equipment) {
      setEditingEquipment(equipment);
      const isBrandPredefined = predefinedBrandOptionsList.includes(equipment.brand) && equipment.brand !== "Outra";
      const isEquipmentTypePredefined = equipmentTypeOptions.includes(equipment.equipmentType as any);

      form.reset({
        ...equipment,
        model: equipment.model || "",
        brand: isBrandPredefined ? equipment.brand : '_CUSTOM_',
        customBrand: isBrandPredefined ? "" : (equipment.brand === "Outra" || equipment.brand === "_CUSTOM_" ? "" : equipment.brand),
        equipmentType: isEquipmentTypePredefined ? equipment.equipmentType : '_CUSTOM_',
        customEquipmentType: isEquipmentTypePredefined ? "" : equipment.equipmentType,
        customerId: equipment.customerId || null, 
        ownerReference: equipment.ownerReference || null,
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
        partsCatalogUrl: equipment.partsCatalogUrl || null,
        errorCodesUrl: equipment.errorCodesUrl || null,
      });
      setShowCustomFields({ brand: !isBrandPredefined, equipmentType: !isEquipmentTypePredefined });
    } else {
      setEditingEquipment(null);
      form.reset({
        brand: "", model: "", chassisNumber: "", equipmentType: "Empilhadeira Contrabalançada GLP",
        operationalStatus: "Disponível", customerId: null, 
        ownerReference: null, 
        manufactureYear: new Date().getFullYear(),
        customBrand: "", customEquipmentType: "",
        towerOpenHeightMm: undefined, towerClosedHeightMm: undefined, nominalCapacityKg: undefined,
        batteryBoxWidthMm: undefined, batteryBoxHeightMm: undefined, batteryBoxDepthMm: undefined,
        notes: "", monthlyRentalValue: undefined, hourMeter: undefined,
        partsCatalogUrl: null, errorCodesUrl: null,
      });
      setShowCustomFields({ brand: false, equipmentType: false });
    }
    setIsModalOpen(true);
  }, [form]);

  useEffect(() => {
    if (equipmentIdFromUrl && !isLoadingEquipment && equipmentList.length > 0 && !isModalOpen) {
      const equipmentToEdit = equipmentList.find(eq => eq.id === equipmentIdFromUrl);
      if (equipmentToEdit) {
        openModal(equipmentToEdit);
        if (typeof window !== "undefined") {
           window.history.replaceState(null, '', '/equipment');
        }
      }
    }
  }, [equipmentIdFromUrl, equipmentList, isLoadingEquipment, openModal, isModalOpen]);

  const prepareDataForFirestore = (
    formData: z.infer<typeof EquipmentSchema>,
    newPartsCatalogUrl?: string | null,
    newErrorCodesUrl?: string | null
  ): Omit<Equipment, 'id' | 'customBrand' | 'customEquipmentType'> => {
    const { customBrand, customEquipmentType, customerId: formCustomerId, ownerReference: formOwnerReferenceFromForm, ...restOfData } = formData;
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

    const finalOwnerReference: OwnerReferenceType | null = formOwnerReferenceFromForm ?? null;

    return {
      ...parsedData,
      brand: parsedData.brand === '_CUSTOM_' ? customBrand || "Não especificado" : parsedData.brand,
      model: parsedData.model,
      equipmentType: parsedData.equipmentType === '_CUSTOM_' ? customEquipmentType || "Não especificado" : parsedData.equipmentType,
      customerId: formCustomerId, 
      ownerReference: finalOwnerReference,
      notes: parsedData.notes || null,
      partsCatalogUrl: newPartsCatalogUrl === undefined ? formData.partsCatalogUrl : newPartsCatalogUrl,
      errorCodesUrl: newErrorCodesUrl === undefined ? formData.errorCodesUrl : newErrorCodesUrl,
    };
  };

  const addEquipmentMutation = useMutation({
    mutationFn: async (data: {
      formData: z.infer<typeof EquipmentSchema>,
      catalogFile: File | null,
      codesFile: File | null
    }) => {
      setIsUploadingFiles(true);
      const newEquipmentId = doc(collection(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME)).id;
      let partsCatalogUrl: string | null = null;
      let errorCodesUrl: string | null = null;

      if (data.catalogFile) {
        partsCatalogUrl = await uploadFile(data.catalogFile, newEquipmentId, 'partsCatalog');
      }
      if (data.codesFile) {
        errorCodesUrl = await uploadFile(data.codesFile, newEquipmentId, 'errorCodes');
      }

      const equipmentDataForFirestore = prepareDataForFirestore(data.formData, partsCatalogUrl, errorCodesUrl);
      await setDoc(doc(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME, newEquipmentId), equipmentDataForFirestore);
      return { ...equipmentDataForFirestore, id: newEquipmentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Equipamento Criado", description: `${data.brand} ${data.model} adicionado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      let message = `Não foi possível criar ${variables.formData.brand} ${variables.formData.model}. Detalhe: ${err.message}`;
      if (err.message.includes("Um cliente deve ser selecionado")) {
        message = err.message;
      }
      toast({ title: "Erro ao Criar", description: message, variant: "destructive" });
    },
    onSettled: () => setIsUploadingFiles(false)
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async (data: {
      id: string,
      formData: z.infer<typeof EquipmentSchema>,
      catalogFile: File | null,
      codesFile: File | null,
      currentEquipment: Equipment
    }) => {
      setIsUploadingFiles(true);
      let newPartsCatalogUrl = data.currentEquipment.partsCatalogUrl;
      let newErrorCodesUrl = data.currentEquipment.errorCodesUrl;

      if (data.catalogFile) {
        await deleteFileFromStorage(data.currentEquipment.partsCatalogUrl);
        newPartsCatalogUrl = await uploadFile(data.catalogFile, data.id, 'partsCatalog');
      }
      if (data.codesFile) {
        await deleteFileFromStorage(data.currentEquipment.errorCodesUrl);
        newErrorCodesUrl = await uploadFile(data.codesFile, data.id, 'errorCodes');
      }

      const equipmentDataForFirestore = prepareDataForFirestore(data.formData, newPartsCatalogUrl, newErrorCodesUrl);
      const equipmentRef = doc(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME, data.id);
      await updateDoc(equipmentRef, equipmentDataForFirestore);
      return { ...equipmentDataForFirestore, id: data.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Equipamento Atualizado", description: `${data.brand} ${data.model} atualizado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      let message = `Não foi possível atualizar ${variables.formData.brand} ${variables.formData.model}. Detalhe: ${err.message}`;
      if (err.message.includes("Um cliente deve ser selecionado")) {
        message = err.message;
      }
      toast({ title: "Erro ao Atualizar", description: message, variant: "destructive" });
    },
    onSettled: () => setIsUploadingFiles(false)
  });

  const removeFileMutation = useMutation({
    mutationFn: async (data: { equipmentId: string; fileType: 'partsCatalogUrl' | 'errorCodesUrl'; fileUrl: string }) => {
      await deleteFileFromStorage(data.fileUrl);
      const equipmentRef = doc(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME, data.equipmentId);
      await updateDoc(equipmentRef, { [data.fileType]: null });
      return { equipmentId: data.equipmentId, fileType: data.fileType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      if(editingEquipment && editingEquipment.id === data.equipmentId){
        setEditingEquipment(prev => prev ? ({...prev, [data.fileType]: null}) : null);
        form.setValue(data.fileType, null);
      }
      toast({ title: "Arquivo Removido", description: "O arquivo foi removido com sucesso." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Remover Arquivo", description: err.message, variant: "destructive" });
    }
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentToDelete: Equipment) => {
      if (!equipmentToDelete?.id) {
        throw new Error("ID do equipamento inválido fornecido para a função de mutação.");
      }
      const { id, partsCatalogUrl, errorCodesUrl } = equipmentToDelete;
      await deleteFileFromStorage(partsCatalogUrl);
      await deleteFileFromStorage(errorCodesUrl);
      const equipmentRef = doc(db, FIRESTORE_EQUIPMENT_COLLECTION_NAME, id);
      await deleteDoc(equipmentRef);
      return id;
    },
    onSuccess: (deletedEquipmentId) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Equipamento Excluído", description: "O equipamento e seus arquivos foram removidos." });
      closeModal();
    },
    onError: (error: Error, equipmentToDelete) => {
      toast({
        title: "Erro ao Excluir Equipamento",
        description: `Não foi possível excluir o equipamento. Detalhe: ${error.message || 'Erro desconhecido.'}`,
        variant: "destructive",
      });
    },
  });


  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    setPartsCatalogFile(null);
    setErrorCodesFile(null);
    form.reset();
    setShowCustomFields({ brand: false, equipmentType: false });
  };

  const onSubmit = async (values: z.infer<typeof EquipmentSchema>) => {
    if (editingEquipment && editingEquipment.id) {
      updateEquipmentMutation.mutate({
        id: editingEquipment.id,
        formData: values,
        catalogFile: partsCatalogFile,
        codesFile: errorCodesFile,
        currentEquipment: editingEquipment
      });
    } else {
      addEquipmentMutation.mutate({ formData: values, catalogFile: partsCatalogFile, codesFile: errorCodesFile });
    }
  };

  const handleModalDeleteConfirm = () => {
    const equipmentToExclude = editingEquipment;
    if (!equipmentToExclude || !equipmentToExclude.id) {
      toast({ title: "Erro Interno", description: "Referência ao equipamento inválida para exclusão.", variant: "destructive" });
      return;
    }
    const confirmation = window.confirm(`Tem certeza que deseja excluir o equipamento "${equipmentToExclude.brand} ${equipmentToExclude.model}" e seus arquivos associados? Esta ação não pode ser desfeita.`);
    if (confirmation) {
      deleteEquipmentMutation.mutate(equipmentToExclude);
    }
  };


  const handleFileRemove = (fileType: 'partsCatalogUrl' | 'errorCodesUrl') => {
    if (editingEquipment && editingEquipment.id) {
      const fileUrlToRemove = editingEquipment[fileType];
      if (fileUrlToRemove) {
        if (window.confirm(`Tem certeza que deseja remover este ${fileType === 'partsCatalogUrl' ? 'catálogo de peças' : 'arquivo de códigos de erro'}?`)) {
          removeFileMutation.mutate({ equipmentId: editingEquipment.id, fileType, fileUrl: fileUrlToRemove });
        }
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

  const getOwnerDisplayString = (ownerRef?: OwnerReferenceType | null, customerId?: string | null, customersList?: Customer[]): string => {
    if (ownerRef === OWNER_REF_CUSTOMER) {
      const customer = customersList?.find(c => c.id === customerId);
      return customer ? `${customer.name}` : 'Cliente (Não Vinculado)';
    }
    if (companyIds.includes(ownerRef as CompanyId)) {
      const company = companyDisplayOptions.find(c => c.id === ownerRef);
      return company ? `${company.name}` : 'Empresa Desconhecida';
    }
    return 'Não Especificado';
  };

  const getOwnerIcon = (ownerRef?: OwnerReferenceType | null): LucideIcon => {
    if (ownerRef === OWNER_REF_CUSTOMER) return UserCog;
    if (companyIds.includes(ownerRef as CompanyId)) return Building;
    return Construction;
  };

  const isLoadingPage = isLoadingEquipment || isLoadingCustomers;
  const isMutating = addEquipmentMutation.isPending || updateEquipmentMutation.isPending || deleteEquipmentMutation.isPending || removeFileMutation.isPending || isUploadingFiles;

  if (isLoadingPage && !isModalOpen) {
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
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90" disabled={isMutating}>
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
            const ownerDisplay = getOwnerDisplayString(eq.ownerReference, eq.customerId, customers);
            const OwnerIconComponent = getOwnerIcon(eq.ownerReference);
            return (
            <Card
              key={eq.id}
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(eq)}
            >
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">{eq.brand} {eq.model}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                 <p className="flex items-center text-sm">
                    <Tag className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-muted-foreground mr-1">Chassi:</span>
                    <span>{eq.chassisNumber}</span>
                  </p>
                <p className="flex items-center text-sm"><Layers className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Tipo:</span> {eq.equipmentType}</p>
                {eq.manufactureYear && <p className="flex items-center text-sm"><CalendarDays className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Ano:</span> {eq.manufactureYear}</p>}
                <p className="flex items-center text-sm">
                    <OwnerIconComponent className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Propriedade:</span> {ownerDisplay}
                </p>
                <p className="flex items-center text-sm">
                  {operationalStatusIcons[eq.operationalStatus]}
                  <span className="font-medium text-muted-foreground mr-1 ml-2">Status:</span>
                  <span className={cn({
                    'text-green-600': eq.operationalStatus === 'Disponível', // Adjusted for better visibility
                    'text-blue-500': eq.operationalStatus === 'Locada',
                    'text-yellow-600': eq.operationalStatus === 'Em Manutenção', // Adjusted for better visibility
                    'text-red-600': eq.operationalStatus === 'Sucata', // Adjusted for better visibility
                  })}>
                    {eq.operationalStatus}
                  </span>
                </p>
                {customer ? (
                  <p className="flex items-center text-sm">
                    <Users className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Cliente:</span>
                    <Link
                      href={`/customers?openCustomerId=${eq.customerId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-primary hover:underline truncate"
                      title={`Ver detalhes de ${customer.name}`}
                    >
                      {customer.name}
                    </Link>
                  </p>
                ) : eq.customerId ? (
                     <p className="flex items-center text-sm"><Users className="mr-2 h-4 w-4 text-muted-foreground" /> <span className="font-medium text-muted-foreground mr-1">Cliente:</span> ID {eq.customerId} (Carregando...)</p>
                ): null}

                {eq.towerOpenHeightMm !== null && eq.towerOpenHeightMm !== undefined && (
                  <p className="flex items-center text-sm"><ArrowUpFromLine className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Torre Aberta:</span> {eq.towerOpenHeightMm} mm</p>
                )}
                {eq.towerClosedHeightMm !== null && eq.towerClosedHeightMm !== undefined && (
                  <p className="flex items-center text-sm"><ArrowDownToLine className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Torre Fechada:</span> {eq.towerClosedHeightMm} mm</p>
                )}
                 {eq.hourMeter !== null && eq.hourMeter !== undefined && <p className="flex items-center text-sm"><Timer className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Horímetro:</span> {eq.hourMeter}h</p>}
                 {eq.monthlyRentalValue !== null && eq.monthlyRentalValue !== undefined && <p className="flex items-center text-sm"><Coins className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Aluguel Mensal:</span> R$ {eq.monthlyRentalValue.toFixed(2)}</p>}

                 {eq.partsCatalogUrl && (
                    <p className="flex items-center text-sm">
                        <BookOpen className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground mr-1">Catálogo Peças:</span>
                        <a
                          href={eq.partsCatalogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-primary hover:underline hover:text-primary/80 transition-colors truncate"
                          title={`Ver Catálogo de Peças: ${getFileNameFromUrl(eq.partsCatalogUrl)}`}
                        >
                            {getFileNameFromUrl(eq.partsCatalogUrl)}
                        </a>
                    </p>
                 )}
                 {eq.errorCodesUrl && (
                    <p className="flex items-center text-sm">
                        <AlertCircle className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground mr-1">Códigos Erro:</span>
                        <a
                          href={eq.errorCodesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-primary hover:underline hover:text-primary/80 transition-colors truncate"
                          title={`Ver Códigos de Erro: ${getFileNameFromUrl(eq.errorCodesUrl)}`}
                        >
                            {getFileNameFromUrl(eq.errorCodesUrl)}
                        </a>
                    </p>
                 )}
                 {eq.notes && (
                  <p className="flex items-start text-sm">
                    <FileText className="mr-2 mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-muted-foreground mr-1">Obs.:</span>
                    <span className="whitespace-pre-wrap break-words">{eq.notes}</span>
                  </p>
                )}
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
        description="Forneça os detalhes do equipamento, incluindo arquivos PDF se necessário."
        formId="equipment-form"
        isSubmitting={isMutating}
        editingItem={editingEquipment}
        onDeleteConfirm={handleModalDeleteConfirm}
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
            
            <FormField
              control={form.control}
              name="ownerReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propriedade</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === NO_OWNER_REFERENCE_VALUE ? null : value as OwnerReferenceType)}
                    value={field.value || NO_OWNER_REFERENCE_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o proprietário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_OWNER_REFERENCE_VALUE}>Não Especificado / Outro</SelectItem>
                      {companyDisplayOptions.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={OWNER_REF_CUSTOMER}>Cliente Vinculado</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value === OWNER_REF_CUSTOMER && !form.getValues("customerId") && (
                     <FormDescription className="text-destructive">Atenção: Vincule um cliente abaixo para esta opção.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente Associado (Serviço/Locação)</FormLabel>
                  <Select
                    onValueChange={(selectedValue) => field.onChange(selectedValue === NO_CUSTOMER_SELECT_ITEM_VALUE ? null : selectedValue)}
                    value={field.value || NO_CUSTOMER_SELECT_ITEM_VALUE} 
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

            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Arquivos (PDF)</h3>
            <FormItem>
              <FormLabel>Catálogo de Peças (PDF)</FormLabel>
              {editingEquipment?.partsCatalogUrl && !partsCatalogFile && (
                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <a href={editingEquipment.partsCatalogUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <LinkIcon className="h-3 w-3"/> Ver Catálogo: {getFileNameFromUrl(editingEquipment.partsCatalogUrl)}
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleFileRemove('partsCatalogUrl')} className="text-destructive hover:text-destructive">
                    <XCircle className="h-4 w-4 mr-1"/> Remover
                  </Button>
                </div>
              )}
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPartsCatalogFile(e.target.files ? e.target.files[0] : null)}
                  className="mt-1"
                />
              </FormControl>
              {partsCatalogFile && <FormDescription>Novo arquivo selecionado: {partsCatalogFile.name}</FormDescription>}
              <FormMessage />
            </FormItem>

            <FormItem>
              <FormLabel>Códigos de Erro (PDF)</FormLabel>
               {editingEquipment?.errorCodesUrl && !errorCodesFile && (
                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <a href={editingEquipment.errorCodesUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <LinkIcon className="h-3 w-3"/> Ver Códigos: {getFileNameFromUrl(editingEquipment.errorCodesUrl)}
                  </a>
                   <Button type="button" variant="ghost" size="sm" onClick={() => handleFileRemove('errorCodesUrl')} className="text-destructive hover:text-destructive">
                    <XCircle className="h-4 w-4 mr-1"/> Remover
                  </Button>
                </div>
              )}
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setErrorCodesFile(e.target.files ? e.target.files[0] : null)}
                  className="mt-1"
                />
              </FormControl>
              {errorCodesFile && <FormDescription>Novo arquivo selecionado: {errorCodesFile.name}</FormDescription>}
              <FormMessage />
            </FormItem>


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

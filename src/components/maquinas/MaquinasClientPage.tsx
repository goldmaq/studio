
"use client";

import React from 'react';
import { useState, useEffect, useCallback, useMemo } from "react";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Construction, Tag, Layers, CalendarDays, CheckCircle, User, Loader2, Users, FileText, Coins, Package, ShieldAlert, Trash2, AlertTriangle as AlertIconLI, UploadCloud, BookOpen, AlertCircle, Link as LinkIcon, XCircle, Building, UserCog, ArrowUpFromLine, ArrowDownToLine, Timer, Search, Database } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import type { Maquina, Customer, CompanyId, OwnerReferenceType } from "@/types";
import { MaquinaSchema, maquinaTypeOptions, maquinaOperationalStatusOptions, companyDisplayOptions, OWNER_REF_CUSTOMER, companyIds } from "@/types"; 
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder"; 
import { FormModal } from "@/components/shared/FormModal";
import { ClipboardSignature } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc, where } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const FIRESTORE_EQUIPMENT_COLLECTION_NAME = "equipamentos"; 
const FIRESTORE_CUSTOMER_COLLECTION_NAME = "clientes";

const ALL_CUSTOMERS_FILTER_VALUE = "_ALL_CUSTOMERS_";
const NO_CUSTOMER_SELECT_ITEM_VALUE = "_NO_CUSTOMER_SELECTED_";
const LOADING_CUSTOMERS_SELECT_ITEM_VALUE = "_LOADING_CUSTOMERS_";

const ALL_STATUSES_FILTER_VALUE = "_ALL_STATUSES_";

const NO_OWNER_REFERENCE_VALUE = "_NOT_SPECIFIED_";

const operationalStatusIcons: Record<typeof maquinaOperationalStatusOptions[number], JSX.Element> = {
  Disponível: <CheckCircle className="h-4 w-4 text-green-500" />,
  Locada: <Package className="h-4 w-4 text-blue-500" />,
  'Em Manutenção': <ShieldAlert className="h-4 w-4 text-yellow-500" />,
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
  maquinaId: string,
  fileTypePrefix: 'partsCatalog' | 'errorCodes'
): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage connection not available.");
  }
  const filePath = `equipment_files/${maquinaId}/${fileTypePrefix}_${file.name}`; 
  const fileStorageRef = storageRef(storage!, filePath);
  await uploadBytes(fileStorageRef, file);
  return getDownloadURL(fileStorageRef);
}

async function deleteFileFromStorage(fileUrl?: string | null) {
  if (fileUrl) {
    if (!storage) {
      console.warn("deleteFileFromStorage: Firebase Storage connection not available. Skipping deletion.");
      return;
    }
    try {
      const gcsPath = new URL(fileUrl).pathname.split('/o/')[1].split('?')[0];
      const decodedPath = decodeURIComponent(gcsPath);
      const fileStorageRef = storageRef(storage!, decodedPath);
      await deleteObject(fileStorageRef);
    } catch (e) {
      console.warn(`[DELETE FILE] Failed to delete file from storage: ${fileUrl}`, e);
    }
  }
}


async function fetchMaquinas(): Promise<Maquina[]> { 
  if (!db) {
    throw new Error("Firebase Firestore connection not available.");
  }
  const q = query(collection(db!, FIRESTORE_EQUIPMENT_COLLECTION_NAME), orderBy("brand", "asc"), orderBy("model", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      brand: data.brand || "Marca Desconhecida",
      model: data.model || "Modelo Desconhecido",
      chassisNumber: data.chassisNumber || "N/A",
      equipmentType: (maquinaTypeOptions.includes(data.equipmentType as any) || typeof data.equipmentType === 'string') ? data.equipmentType : "Empilhadeira Contrabalançada GLP",
      manufactureYear: parseNumericToNullOrNumber(data.manufactureYear),
      operationalStatus: maquinaOperationalStatusOptions.includes(data.operationalStatus as any) ? data.operationalStatus : "Disponível",
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
      fleetNumber: data.fleetNumber || null,
      errorCodesUrl: data.errorCodesUrl || null,
    } as Maquina;
  });
};

async function fetchCustomers(): Promise<Customer[]> {
  if (!db) {
    throw new Error("Firebase Firestore connection not available.");
  }
  const q = query(collection(db!, FIRESTORE_CUSTOMER_COLLECTION_NAME), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Customer));
}

interface MaquinasClientPageProps {
 maquinaIdFromUrl?: string | null;
}

export function MaquinasClientPage({ maquinaIdFromUrl }: MaquinasClientPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<Maquina | null>(null); 
  const [partsCatalogFile, setPartsCatalogFile] = useState<File | null>(null);
  const [errorCodesFile, setErrorCodesFile] = useState<File | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);

  const [showCustomFields, setShowCustomFields] = useState({
    brand: false,
    equipmentType: false,
  });
  const form = useForm<z.infer<typeof MaquinaSchema>>({
    resolver: zodResolver(MaquinaSchema),
    defaultValues: {
      brand: "", model: "", chassisNumber: "", equipmentType: maquinaTypeOptions[0],
      operationalStatus: "Disponível", customerId: null, 
      ownerReference: null, 
      manufactureYear: new Date().getFullYear(),
      customBrand: "", customEquipmentType: "",
      towerOpenHeightMm: undefined, towerClosedHeightMm: undefined,
      nominalCapacityKg: undefined,
      batteryBoxWidthMm: undefined, batteryBoxHeightMm: undefined, batteryBoxDepthMm: undefined,
      notes: "", monthlyRentalValue: undefined, hourMeter: undefined, fleetNumber: null,
      partsCatalogUrl: null, errorCodesUrl: null,
    },
  });

  const { data: maquinaList = [], isLoading: isLoadingMaquinas, isError: isErrorMaquinas, error: errorMaquinas } = useQuery<Maquina[], Error>({
    queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME], 
    queryFn: fetchMaquinas, 
    enabled: !!db,
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[], Error>({
    queryKey: [FIRESTORE_CUSTOMER_COLLECTION_NAME],
    queryFn: fetchCustomers,
    enabled: !!db,
  });
  
  useEffect(() => {
    // Set default filters after initial load
    if (!isLoadingMaquinas && maquinaList.length > 0 && statusFilter === null && customerFilter === null) {
      setStatusFilter(ALL_STATUSES_FILTER_VALUE);
      setCustomerFilter(ALL_CUSTOMERS_FILTER_VALUE);
    }
  }, [isLoadingMaquinas, maquinaList, statusFilter, customerFilter]);

  const filteredMaquinas = useMemo(() => {
    return maquinaList?.filter(maquina => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const matchesSearch =
        (maquina.brand?.toLowerCase() ?? '').includes(lowerCaseSearchTerm) ||
        (maquina.fleetNumber?.toLowerCase() ?? '').includes(lowerCaseSearchTerm);

        const matchesStatus = statusFilter && statusFilter !== ALL_STATUSES_FILTER_VALUE
        ? maquina.operationalStatus === statusFilter
        : true;
            const matchesCustomer = customerFilter && customerFilter !== ALL_CUSTOMERS_FILTER_VALUE ? maquina.customerId === customerFilter : true;
      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [maquinaList, searchTerm, statusFilter, customerFilter]);

  const openModal = useCallback((maquina?: Maquina) => { 
    setPartsCatalogFile(null); // Clear file inputs on opening
    setErrorCodesFile(null);
    if (maquina) {
      setEditingMaquina(maquina);
      const isBrandPredefined = maquina.brand ? (predefinedBrandOptionsList.includes(maquina.brand) && maquina.brand !== "Outra") : false;
      const isEquipmentTypePredefined = maquina.equipmentType ? maquinaTypeOptions.includes(maquina.equipmentType as any) : false;

     form.reset({
        ...maquina,
        model: maquina.model || "",
        brand: isBrandPredefined ? maquina.brand : '_CUSTOM_',
        customBrand: isBrandPredefined ? "" : (maquina.brand === "Outra" || maquina.brand === "_CUSTOM_" ? "" : maquina.brand),
        equipmentType: isEquipmentTypePredefined ? maquina.equipmentType : '_CUSTOM_',
        customEquipmentType: isEquipmentTypePredefined ? "" : maquina.equipmentType,
        customerId: maquina.customerId || null, 
        ownerReference: maquina.ownerReference || null,
        manufactureYear: maquina.manufactureYear ?? new Date().getFullYear(),
        towerOpenHeightMm: maquina.towerOpenHeightMm ?? undefined,
        towerClosedHeightMm: maquina.towerClosedHeightMm ?? undefined,
        nominalCapacityKg: maquina.nominalCapacityKg ?? undefined,
        batteryBoxWidthMm: maquina.batteryBoxWidthMm ?? undefined,
        batteryBoxHeightMm: maquina.batteryBoxHeightMm ?? undefined,
        batteryBoxDepthMm: maquina.batteryBoxDepthMm ?? undefined,
        monthlyRentalValue: maquina.monthlyRentalValue ?? undefined,
        hourMeter: maquina.hourMeter ?? undefined,
        notes: maquina.notes || "",
        fleetNumber: maquina.fleetNumber ?? null,
        partsCatalogUrl: maquina.partsCatalogUrl || null,
        errorCodesUrl: maquina.errorCodesUrl || null,
      });
      setShowCustomFields({ brand: !isBrandPredefined, equipmentType: !isEquipmentTypePredefined });
      setIsEditMode(false);
    } else {
      setEditingMaquina(null); 
      form.reset({
        brand: "", model: "", chassisNumber: "", equipmentType: maquinaTypeOptions[0], // Default to the first option
        operationalStatus: "Disponível", customerId: null, 
        ownerReference: null, 
        manufactureYear: new Date().getFullYear(),
        customBrand: "", customEquipmentType: "",
        towerOpenHeightMm: undefined, towerClosedHeightMm: undefined, nominalCapacityKg: undefined,
        batteryBoxWidthMm: undefined, batteryBoxHeightMm: undefined, batteryBoxDepthMm: undefined,
        notes: "", monthlyRentalValue: undefined, hourMeter: undefined,
        fleetNumber: null,
        partsCatalogUrl: null, errorCodesUrl: null,
      });
      setShowCustomFields({ brand: false, equipmentType: false });
      setIsEditMode(true);
    }
    setIsModalOpen(true);
  }, [form]); 

 useEffect(() => {
    if (maquinaIdFromUrl && !isLoadingMaquinas && maquinaList.length > 0 && !isModalOpen) { 
      const maquinaToEdit = maquinaList.find(eq => eq.id === maquinaIdFromUrl); 
      if (maquinaToEdit) {
        openModal(maquinaToEdit);
        if (typeof window !== "undefined") {
           window.history.replaceState(null, '', '/maquinas'); 
        }
      }
    }
  }, [maquinaIdFromUrl, maquinaList, isLoadingMaquinas, openModal, isModalOpen]); 
  
  const prepareDataForFirestore = (
    formData: z.infer<typeof MaquinaSchema>,
    newPartsCatalogUrl?: string | null, // Make these optional
    newErrorCodesUrl?: string | null
  ): Omit<Maquina, 'id' | 'customBrand' | 'customEquipmentType'> => { 
    const { customBrand, customEquipmentType, customerId: formCustomerId, ownerReference: formOwnerReferenceFromForm, fleetNumber: formFleetNumber, ...restOfData } = formData;
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
    const finalFleetNumber: string | null = formFleetNumber || null;

    return {
      ...parsedData,
      fleetNumber: finalFleetNumber,
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

  const addMaquinaMutation = useMutation({ 
    mutationFn: async (data: {
      formData: z.infer<typeof MaquinaSchema>, 
      catalogFile: File | null,
      codesFile: File | null
    }) => {
      if (!db || !storage) {
        throw new Error("Firebase Firestore ou Storage connection not available.");
      }
      setIsUploadingFiles(true);
      const newMaquinaId = doc(collection(db!, FIRESTORE_EQUIPMENT_COLLECTION_NAME)).id;
      let partsCatalogUrl: string | null = null;
      let errorCodesUrl: string | null = null;

      if (data.catalogFile) {
        partsCatalogUrl = await uploadFile(data.catalogFile, newMaquinaId, 'partsCatalog');
      }
      if (data.codesFile) {
        errorCodesUrl = await uploadFile(data.codesFile, newMaquinaId, 'errorCodes');
      }

      const maquinaDataForFirestore = prepareDataForFirestore(data.formData, partsCatalogUrl, errorCodesUrl);
      await setDoc(doc(db!, FIRESTORE_EQUIPMENT_COLLECTION_NAME, newMaquinaId), maquinaDataForFirestore);
      return { ...maquinaDataForFirestore, id: newMaquinaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Máquina Criada", description: `${data.brand} ${data.model} adicionada.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      let message = `Não foi possível criar ${variables.formData.brand} ${variables.formData.model}. Detalhe: ${err.message}`;
      if (err.message.includes("Um cliente deve ser selecionado")) {
        message = err.message;
      }
      toast({ title: "Erro ao Criar Máquina", description: message, variant: "destructive" });
    },
    onSettled: () => setIsUploadingFiles(false)
  });

  const updateMaquinaMutation = useMutation({ 
    mutationFn: async (data: {
      id: string,
      formData: z.infer<typeof MaquinaSchema>, 
      catalogFile: File | null, // New file to upload
      codesFile: File | null, // New file to upload
      currentMaquina: Maquina 
    }) => {
      if (!db || !storage) {
        throw new Error("Firebase Firestore ou Storage connection not available.");
      }
      setIsUploadingFiles(true);
      let newPartsCatalogUrl = data.currentMaquina.partsCatalogUrl;
      let newErrorCodesUrl = data.currentMaquina.errorCodesUrl;

      if (data.catalogFile) {
        await deleteFileFromStorage(data.currentMaquina.partsCatalogUrl);
        newPartsCatalogUrl = await uploadFile(data.catalogFile, data.id, 'partsCatalog');
      }
      if (data.codesFile) {
        await deleteFileFromStorage(data.currentMaquina.errorCodesUrl);
        newErrorCodesUrl = await uploadFile(data.codesFile, data.id, 'errorCodes');
      }

      const maquinaDataForFirestore = prepareDataForFirestore(data.formData, newPartsCatalogUrl, newErrorCodesUrl);
      const maquinaRef = doc(db!, FIRESTORE_EQUIPMENT_COLLECTION_NAME, data.id);
      await updateDoc(maquinaRef, maquinaDataForFirestore);
      return { ...maquinaDataForFirestore, id: data.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Máquina Atualizada", description: `${data.brand} ${data.model} atualizada.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      let message = `Não foi possível atualizar ${variables.formData.brand} ${variables.formData.model}. Detalhe: ${err.message}`;
      if (err.message.includes("Um cliente deve ser selecionado")) {
        message = err.message;
      }
      toast({ title: "Erro ao Atualizar Máquina", description: message, variant: "destructive" });
    },
    onSettled: () => setIsUploadingFiles(false)
  });

  const removeFileMutation = useMutation({
    mutationFn: async (data: { maquinaId: string; fileType: 'partsCatalogUrl' | 'errorCodesUrl'; fileUrl: string }) => {
      if (!db || !storage) {
        throw new Error("Firebase Firestore ou Storage connection not available.");
      }
      await deleteFileFromStorage(data.fileUrl);
      const maquinaRef = doc(db!, FIRESTORE_EQUIPMENT_COLLECTION_NAME, data.maquinaId);
      await updateDoc(maquinaRef, { [data.fileType]: null });
      return { maquinaId: data.maquinaId, fileType: data.fileType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      if(editingMaquina && editingMaquina.id === data.maquinaId){ 
        setEditingMaquina(prev => prev ? ({...prev, [data.fileType]: null}) : null); 
        form.setValue(data.fileType, null);
      }
      toast({ title: "Arquivo Removido", description: "O arquivo foi removido com sucesso." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Remover Arquivo", description: err.message, variant: "destructive" });
    }
  });

  const deleteMaquinaMutation = useMutation({ 
    mutationFn: async (maquinaToDelete: Maquina) => { 
      if (!db || !storage) {
        throw new Error("Firebase Firestore ou Storage connection not available.");
      }
      if (!maquinaToDelete?.id) {
        throw new Error("ID da máquina inválido fornecido para a função de mutação.");
      }
      const { id, partsCatalogUrl, errorCodesUrl } = maquinaToDelete;
      await deleteFileFromStorage(partsCatalogUrl);
      await deleteFileFromStorage(errorCodesUrl);
      const maquinaRef = doc(db!, FIRESTORE_EQUIPMENT_COLLECTION_NAME, id);
      await deleteDoc(maquinaRef);
      return id;
    },
    onSuccess: (deletedMaquinaId) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_EQUIPMENT_COLLECTION_NAME] });
      toast({ title: "Máquina Excluída", description: "A máquina e seus arquivos foram removidos." });
      closeModal();
    },
    onError: (error: Error, maquinaToDelete) => {
      toast({
        title: "Erro ao Excluir Máquina",
        description: `Não foi possível excluir a máquina. Detalhe: ${error.message || 'Erro desconhecido.'}`,
        variant: "destructive"
      });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMaquina(null); 
    setPartsCatalogFile(null);
    setErrorCodesFile(null);
    form.reset();
    setShowCustomFields({ brand: false, equipmentType: false });
    setIsEditMode(false);
  };

  const onSubmit = async (values: z.infer<typeof MaquinaSchema>) => { 
    if (editingMaquina && editingMaquina.id) { 
      updateMaquinaMutation.mutate({ 
        id: editingMaquina.id,
        formData: values,
        catalogFile: partsCatalogFile,
        codesFile: errorCodesFile,
        currentMaquina: editingMaquina 
      });
    } else {
      addMaquinaMutation.mutate({ formData: values, catalogFile: partsCatalogFile, codesFile: errorCodesFile }); 
    }
  };

  const handleModalDeleteConfirm = () => {
    const maquinaToExclude = editingMaquina; 
    if (!maquinaToExclude || !maquinaToExclude.id) {
      toast({ title: "Erro Interno", description: "Referência à máquina inválida para exclusão.", variant: "destructive" });
      return;
    }
    const confirmation = window.confirm(`Tem certeza que deseja excluir a máquina "${maquinaToExclude.brand} ${maquinaToExclude.model}" e seus arquivos associados? Esta ação não pode ser desfeita.`);
    if (confirmation) {
      deleteMaquinaMutation.mutate(maquinaToExclude); 
    }
  };

  const handleFileRemove = (fileType: 'partsCatalogUrl' | 'errorCodesUrl') => {
    if (editingMaquina && editingMaquina.id) { 
      const fileUrlToRemove = editingMaquina[fileType];
      if (fileUrlToRemove) {
        if (window.confirm(`Tem certeza que deseja remover este ${fileType === 'partsCatalogUrl' ? 'catálogo de peças' : 'arquivo de códigos de erro'}?`)) {
          removeFileMutation.mutate({ maquinaId: editingMaquina.id, fileType, fileUrl: fileUrlToRemove });
        }
      }
    }
  };

  const handleSelectChange = (field: 'brand' | 'equipmentType', value: string) => {
    form.setValue(field, value as any);
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

  const isLoadingPage = isLoadingMaquinas || isLoadingCustomers;
  const isMutating = addMaquinaMutation.isPending || updateMaquinaMutation.isPending || deleteMaquinaMutation.isPending || removeFileMutation.isPending || isUploadingFiles || isSeeding;

  if (!db || !storage) {
    return ( // Display error if Firebase connection fails
      <div className="flex flex-col items-center justify-center h-full">
        <AlertIconLI className="h-16 w-16 text-destructive mb-4" />
        <PageHeader title="Erro de Conexão" />
        <p className="text-lg text-center text-muted-foreground">
          Não foi possível conectar aos serviços do Firebase.
          <br />
          Verifique a configuração e sua conexão com a internet.
        </p>
      </div>
    );
  }

  if (isLoadingPage && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando dados...</p>
      </div>
    );
  }

  if (isErrorMaquinas) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertIconLI className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Máquinas</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {errorMaquinas?.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader // Page title and Add button
        title="Máquinas" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90" disabled={isMutating}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Máquina
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="md:col-span-1 flex items-center">
          <Input
            placeholder="Pesquisar máquina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Status Filter */}
        <div className="md:col-span-1">
        <Select onValueChange={(value) => setStatusFilter(value)} value={statusFilter ?? ALL_STATUSES_FILTER_VALUE}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Filtrar por Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={ALL_STATUSES_FILTER_VALUE}>Todos os Status</SelectItem>
    {maquinaOperationalStatusOptions.map(status => (
      <SelectItem key={status} value={status}>{status}</SelectItem>
    ))}
  </SelectContent>
</Select>
        </div>

        {/* Customer Filter - Show only if there are customers */}
        {!isLoadingCustomers && customers.length > 0 && (
        <div className="md:col-span-2 lg:col-span-2">
          <Select onValueChange={setCustomerFilter} value={customerFilter ?? ALL_CUSTOMERS_FILTER_VALUE}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingCustomers ? "Carregando clientes..." : "Filtrar por Cliente"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CUSTOMERS_FILTER_VALUE}>Todos os Clientes</SelectItem>
              <SelectItem value={NO_CUSTOMER_SELECT_ITEM_VALUE}>Sem Cliente Vinculado</SelectItem>

              {isLoadingCustomers ? (
                // Display loading state if customers are still being fetched
                <SelectItem value={LOADING_CUSTOMERS_SELECT_ITEM_VALUE} disabled>Carregando clientes...</SelectItem>
              ) : (
                customers.map(cust => (
                  <SelectItem key={cust.id} value={cust.id}>{cust.name} ({cust.cnpj})</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        )}
      </div>

      {isLoadingMaquinas && (
         <div className="flex justify-center items-center h-64">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="ml-2">Carregando máquinas...</p>
         </div>
      )}
      {/* Placeholder for no machines registered */}
      {!isLoadingMaquinas && maquinaList.length === 0 && searchTerm === "" && statusFilter === null && customerFilter === null && (
        <DataTablePlaceholder
          icon={Construction}
          title="Nenhuma Máquina Registrada"
          description="Comece adicionando a primeira máquina ao seu inventário."
          buttonLabel="Adicionar Máquina" 
          onButtonClick={() => openModal()}
        />
      )}
       {/* Placeholder for no results with filters/search */}
      {!isLoadingMaquinas && filteredMaquinas.length === 0 && (searchTerm !== "" || statusFilter !== null || customerFilter !== null) && (
        <DataTablePlaceholder
          icon={Search}
          title="Nenhuma Máquina Encontrada"
          description={`Nenhum resultado para os filtros aplicados ou pesquisa "${searchTerm}".`}
          buttonLabel="Limpar Filtros/Pesquisa"
          onButtonClick={() => {
            setSearchTerm("");
            setStatusFilter(null);
            setCustomerFilter(null);
          }}
        />
      )}
       {/* Display list of machines */}

      {!isLoadingMaquinas && filteredMaquinas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaquinas.map((maq) => {
            const customer = maq.customerId ? customers.find(c => c.id === maq.customerId) : null;
            const ownerDisplay = getOwnerDisplayString(maq.ownerReference, maq.customerId, customers);
            const OwnerIconComponent = getOwnerIcon(maq.ownerReference);
            return (
            <Card
              key={maq.id}
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(maq)}
            >
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">{maq.brand} {maq.model}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                 <p className="flex items-center text-sm">
                    <Tag className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-muted-foreground mr-1">Chassi:</span>
                    <span>{maq.chassisNumber}</span>
                  </p>
                 {maq.fleetNumber && (
                  <p className="flex items-center text-sm">
                    <ClipboardSignature className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-muted-foreground mr-1">Frota:</span>
                    <span>{maq.fleetNumber}</span>
                  </p>
                 )}
                <p className="flex items-center text-sm"><Layers className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Tipo:</span> {maq.equipmentType}</p>
                {maq.manufactureYear && <p className="flex items-center text-sm"><CalendarDays className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Ano:</span> {maq.manufactureYear}</p>}
                <p className="flex items-center text-sm">
                    <OwnerIconComponent className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Propriedade:</span> {ownerDisplay}
                </p>
                <p className="flex items-center text-sm">
                  {operationalStatusIcons[maq.operationalStatus]}
                  <span className="font-medium text-muted-foreground mr-1 ml-2">Status:</span>
                  <span className={cn({
                    'text-green-600': maq.operationalStatus === 'Disponível',
                    'text-blue-500': maq.operationalStatus === 'Locada',
                    'text-yellow-600': maq.operationalStatus === 'Em Manutenção',
                    'text-red-600': maq.operationalStatus === 'Sucata',
                  })}>
                    {maq.operationalStatus}
                  </span>
                </p>
                {customer ? (
                  <p className="flex items-center text-sm">
                    <Users className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Cliente:</span>
                    <Link
                      href={`/customers?openCustomerId=${maq.customerId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-primary hover:underline truncate"
                      title={`Ver detalhes de ${customer.name}`}
                    >
                      {customer.name}
                    </Link>
                  </p>
                ) : maq.customerId ? (
                     <p className="flex items-center text-sm"><Users className="mr-2 h-4 w-4 text-muted-foreground" /> <span className="font-medium text-muted-foreground mr-1">Cliente:</span> ID {maq.customerId} (Carregando...)</p>
                ): null}

                {maq.towerOpenHeightMm !== null && maq.towerOpenHeightMm !== undefined && (
                  <p className="flex items-center text-sm"><ArrowUpFromLine className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">H3 - Torre Aberta:</span> {maq.towerOpenHeightMm} mm</p>
                )}
                {maq.towerClosedHeightMm !== null && maq.towerClosedHeightMm !== undefined && (
                  <p className="flex items-center text-sm"><ArrowDownToLine className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">H1 - Torre Fechada:</span> {maq.towerClosedHeightMm} mm</p>
                )}
                 {maq.hourMeter !== null && maq.hourMeter !== undefined && <p className="flex items-center text-sm"><Timer className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Horímetro:</span> {maq.hourMeter}h</p>}
                 {maq.monthlyRentalValue !== null && maq.monthlyRentalValue !== undefined && <p className="flex items-center text-sm"><Coins className="mr-2 h-4 w-4 text-primary" /> <span className="font-medium text-muted-foreground mr-1">Aluguel Mensal:</span> R$ {Number(maq.monthlyRentalValue).toFixed(2)}</p>}

                 {maq.partsCatalogUrl && (
                    <p className="flex items-center text-sm">
                        <BookOpen className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground mr-1">Catálogo Peças:</span>
                        <a
                          href={maq.partsCatalogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-primary hover:underline hover:text-primary/80 transition-colors truncate"
                          title={`Ver Catálogo de Peças: ${getFileNameFromUrl(maq.partsCatalogUrl)}`}
                        >
                            {getFileNameFromUrl(maq.partsCatalogUrl)}
                        </a>
                    </p>
                 )}
                 {maq.errorCodesUrl && (
                    <p className="flex items-center text-sm">
                        <AlertCircle className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground mr-1">Códigos Erro:</span>
                        <a
                          href={maq.errorCodesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-primary hover:underline hover:text-primary/80 transition-colors truncate"
                          title={`Ver Códigos de Erro: ${getFileNameFromUrl(maq.errorCodesUrl)}`}
                        >
                            {getFileNameFromUrl(maq.errorCodesUrl)}
                        </a>
                    </p>
                 )}
                 {maq.notes && (
                  <p className="flex items-start text-sm">
                    <FileText className="mr-2 mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-muted-foreground mr-1">Obs.:</span>
                    <span className="whitespace-pre-wrap break-words">{maq.notes}</span>
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
        title={editingMaquina ? "Editar Máquina" : "Adicionar Nova Máquina"} 
        description="Forneça os detalhes da máquina, incluindo arquivos PDF se necessário." 
        formId="maquina-form" 
        isSubmitting={isMutating}
        editingItem={editingMaquina} 
        onDeleteConfirm={handleModalDeleteConfirm} 
        onEditModeToggle={() => setIsEditMode(true)} 
        isDeleting={deleteMaquinaMutation.isPending} 
        isEditMode={isEditMode}
        deleteButtonLabel="Excluir Máquina" 
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="maquina-form" className="space-y-4"> 
            <fieldset disabled={isMutating || (!!editingMaquina && !isEditMode)}>
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
                        <SelectTrigger className="w-full">
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
                          <SelectValue placeholder={isLoadingCustomers ? "Carregando clientes..." : "Selecione um cliente (Opcional)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCustomers ? (
                          <SelectItem value={LOADING_CUSTOMERS_SELECT_ITEM_VALUE} disabled>Carregando...</SelectItem>
                        ) : (
                          <>
                            <SelectItem value={NO_CUSTOMER_SELECT_ITEM_VALUE}>Nenhum</SelectItem>
                            {customers.map((cust) => (
                              // Add check to ensure cust.id exists before rendering SelectItem
                              cust.id && (
                                <SelectItem key={cust.id} value={cust.id}>
                                  {cust.name} ({cust.cnpj})
                                </SelectItem>
                              )
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
                    <FormLabel>Tipo de Máquina</FormLabel> 
                    <Select onValueChange={(value) => handleSelectChange('equipmentType', value)} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {maquinaTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)} 
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
                      {maquinaOperationalStatusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)} 
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />

              <FormField
                control={form.control}
                name="fleetNumber"
                render={({ field }) => (
                <FormItem><FormLabel>Número da Frota</FormLabel><FormControl><Input placeholder="Ex: F-001, FROTA123" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )}
              />
            </fieldset>

            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Especificações Técnicas (Opcional)</h3>
            <fieldset disabled={isMutating || (!!editingMaquina && !isEditMode)}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="towerOpenHeightMm" render={({ field }) => (
                  <FormItem><FormLabel>H3 - Torre Aberta (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="towerClosedHeightMm" render={({ field }) => (
                  <FormItem><FormLabel>H1 - Torre Fechada (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nominalCapacityKg" render={({ field }) => (
                  <FormItem><FormLabel>Capacidade Nominal (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </fieldset>

            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Dimensões Caixa de Bateria (Opcional)</h3>
            <fieldset disabled={isMutating || (!!editingMaquina && !isEditMode)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="batteryBoxWidthMm" render={({ field }) => (
                      <FormItem><FormLabel>Largura (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="batteryBoxHeightMm" render={({ field }) => (
                      <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="batteryBoxDepthMm" render={({ field }) => (
                      <FormItem><FormLabel>Comprimento (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
            </fieldset>
            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Arquivos (PDF)</h3>
            <fieldset disabled={isMutating || (!!editingMaquina && !isEditMode)}>
              <FormItem>
                <FormLabel>Catálogo de Peças (PDF)</FormLabel>
                  {editingMaquina?.partsCatalogUrl && !partsCatalogFile && (
                    <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                      <a href={editingMaquina.partsCatalogUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                        <LinkIcon className="h-3 w-3"/> Ver Catálogo: {getFileNameFromUrl(editingMaquina.partsCatalogUrl)}
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
                   {editingMaquina?.errorCodesUrl && !errorCodesFile && ( 
                    <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                      <a href={editingMaquina.errorCodesUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                        <LinkIcon className="h-3 w-3"/> Ver Códigos: {getFileNameFromUrl(editingMaquina.errorCodesUrl)}
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
            </fieldset>

            <h3 className="text-md font-semibold pt-4 border-b pb-1 font-headline">Informações Adicionais (Opcional)</h3>
            <fieldset disabled={isMutating || (!!editingMaquina && !isEditMode)}>
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
            </fieldset>
          </form>
        </Form>
 </FormModal>
    </>
  );
}

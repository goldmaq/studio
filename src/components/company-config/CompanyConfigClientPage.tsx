
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { Edit2, Building, Landmark, Hash, QrCode, MapPin, Contact, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Company, CompanyId } from "@/types";
import { CompanySchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const FIRESTORE_COLLECTION_NAME = "empresas";
const companyIds: CompanyId[] = ["goldmaq", "goldcomercio", "goldjob"];

// Dados iniciais que podem ser usados se uma empresa não existir no Firestore
const initialCompanyDataFromCode: Record<CompanyId, Omit<Company, 'id'>> = {
  goldmaq: { name: "Goldmaq Empilhadeiras", cnpj: "00.000.000/0001-00", address: "Rua Goldmaq, 10, São Paulo, SP", bankName: "Banco Alpha", bankAgency: "0001", bankAccount: "12345-6", bankPixKey: "cnpj@goldmaq.com.br" },
  goldcomercio: { name: "Gold Comércio de Peças", cnpj: "11.111.111/0001-11", address: "Av. Comércio, 20, São Paulo, SP", bankName: "Banco Beta", bankAgency: "0002", bankAccount: "65432-1" },
  goldjob: { name: "Gold Job Locações", cnpj: "22.222.222/0001-22", address: "Praça Job, 30, São Paulo, SP" },
};


async function fetchCompanyConfigs(): Promise<Company[]> {
  const fetchedCompanies: Company[] = [];
  for (const id of companyIds) {
    const docRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      fetchedCompanies.push({ id, ...docSnap.data() } as Company);
    } else {
      // Se não existir no Firestore, cria com os dados iniciais do código
      const initialData = initialCompanyDataFromCode[id];
      if (initialData) {
        await setDoc(docRef, initialData); // Salva no Firestore
        fetchedCompanies.push({ id, ...initialData });
      }
    }
  }
  // Se por algum motivo alguma empresa esperada não foi carregada nem criada,
  // pode ser necessário adicionar um fallback ou logar um aviso.
  // Por enquanto, retornamos o que foi possível buscar/criar.
  return fetchedCompanies;
}


export function CompanyConfigClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const form = useForm<z.infer<typeof CompanySchema>>({
    resolver: zodResolver(CompanySchema),
    defaultValues: {
      name: "", cnpj: "", address: "", bankName: "",
      bankAgency: "", bankAccount: "", bankPixKey: "",
    },
  });

  const { data: companies = [], isLoading, isError, error } = useQuery<Company[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchCompanyConfigs,
     // staleTime: Infinity, // Configurações da empresa raramente mudam, pode ser cacheado por mais tempo.
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (companyData: Company) => {
      const { id, ...dataToUpdate } = companyData;
      if (!id) throw new Error("ID da empresa é necessário para atualização.");
      const companyRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
      return updateDoc(companyRef, dataToUpdate);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Informações da Empresa Atualizadas", description: `Os detalhes de ${variables.name} foram atualizados.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      console.error("Erro ao atualizar empresa:", err);
      toast({ title: "Erro ao Atualizar", description: `Não foi possível atualizar ${variables.name}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });


  const openModal = (company: Company) => {
    setEditingCompany(company);
    form.reset(company);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    form.reset({ name: "", cnpj: "", address: "", bankName: "", bankAgency: "", bankAccount: "", bankPixKey: ""});
  };

  const onSubmit = async (values: z.infer<typeof CompanySchema>) => {
    if (!editingCompany || !editingCompany.id) return;
    updateCompanyMutation.mutate({ ...values, id: editingCompany.id });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando configurações...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Configurações</h2>
        <p className="text-center">Não foi possível buscar os dados. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {error?.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Configurações da Empresa" />

      {companies.length === 0 && !isLoading ? (
         <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Building className="h-12 w-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma Configuração de Empresa Encontrada</h2>
            <p className="text-center">Parece que as configurações iniciais não puderam ser carregadas ou criadas.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
              <Card key={company.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <CardHeader>
                  <CardTitle className="font-headline text-xl flex items-center">
                    <Building className="mr-2 h-6 w-6 text-primary" /> {company.name}
                  </CardTitle>
                  <CardDescription>CNPJ: {company.cnpj}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm">
                  <p className="flex items-start"><MapPin className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> {company.address}</p>
                  {company.bankName && <p className="flex items-center"><Landmark className="mr-2 h-4 w-4 text-primary" /> {company.bankName}</p>}
                  {company.bankAgency && <p className="flex items-center"><Hash className="mr-2 h-4 w-4 text-primary" /> Agência: {company.bankAgency}</p>}
                  {company.bankAccount && <p className="flex items-center"><Contact className="mr-2 h-4 w-4 text-primary" /> Conta: {company.bankAccount}</p>}
                  {company.bankPixKey && <p className="flex items-center"><QrCode className="mr-2 h-4 w-4 text-primary" /> PIX: {company.bankPixKey}</p>}
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button variant="outline" size="sm" onClick={() => openModal(company)} className="w-full" disabled={updateCompanyMutation.isPending}>
                    <Edit2 className="mr-2 h-4 w-4" /> Editar Informações
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Editar Informações da ${editingCompany?.name || 'Empresa'}`}
        description="Atualize os dados cadastrais e bancários da empresa."
        formId="company-form"
        isSubmitting={updateCompanyMutation.isPending}
        editingItem={editingCompany}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="company-form" className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome da Empresa</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="cnpj" render={({ field }) => (
              <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <h3 className="text-md font-semibold pt-2 border-b pb-1 font-headline">Informações Bancárias (Opcional)</h3>
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem><FormLabel>Nome do Banco</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="bankAgency" render={({ field }) => (
                <FormItem><FormLabel>Agência</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bankAccount" render={({ field }) => (
                <FormItem><FormLabel>Conta</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="bankPixKey" render={({ field }) => (
              <FormItem><FormLabel>Chave PIX</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

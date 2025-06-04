
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Users, Edit2, FileText, MapPin, Mail, Building, HardHat, Loader2, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea"; // No longer needed for address
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Customer } from "@/types";
import { CustomerSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "../ui/textarea";

const FIRESTORE_COLLECTION_NAME = "clientes";

async function fetchCustomers(): Promise<Customer[]> {
  const q = query(collection(db, FIRESTORE_COLLECTION_NAME), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

const formatAddressForDisplay = (customer: Customer): string => {
  const parts: string[] = [];
  if (customer.street) {
    let line = customer.street;
    if (customer.number) line += `, ${customer.number}`;
    parts.push(line);
  }
  if (customer.neighborhood) parts.push(customer.neighborhood);
  if (customer.city && customer.state) parts.push(`${customer.city} - ${customer.state}`);
  else if (customer.city) parts.push(customer.city);
  else if (customer.state) parts.push(customer.state);
  
  return parts.join(', ').trim() || "Endereço não fornecido";
};


export function CustomerClientPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const form = useForm<z.infer<typeof CustomerSchema>>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      email: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      preferredTechnician: "",
      notes: "",
    },
  });

  const { data: customers = [], isLoading, isError, error } = useQuery<Customer[], Error>({
    queryKey: [FIRESTORE_COLLECTION_NAME],
    queryFn: fetchCustomers,
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (newCustomerData: z.infer<typeof CustomerSchema>) => {
      const docRef = await addDoc(collection(db, FIRESTORE_COLLECTION_NAME), newCustomerData);
      return docRef;
    },
    onSuccess: (docRef, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Cliente Criado", description: `${variables.name} foi adicionado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Criar", description: `Não foi possível criar o cliente ${variables.name}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (customerData: Customer) => {
      const { id, ...dataToUpdate } = customerData;
      if (!id) throw new Error("ID do cliente é necessário para atualização.");
      const customerRef = doc(db, FIRESTORE_COLLECTION_NAME, id);
      await updateDoc(customerRef, dataToUpdate);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Cliente Atualizado", description: `${variables.name} foi atualizado.` });
      closeModal();
    },
    onError: (err: Error, variables) => {
      toast({ title: "Erro ao Atualizar", description: `Não foi possível atualizar o cliente ${variables.name}. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      if (!customerId) throw new Error("ID do cliente é necessário para exclusão.");
      await deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, customerId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_COLLECTION_NAME] });
      toast({ title: "Cliente Excluído", description: `O cliente foi excluído.` });
      closeModal(); 
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Excluir", description: `Não foi possível excluir o cliente. Detalhe: ${err.message}`, variant: "destructive" });
    },
  });

  const handleSearchCep = async () => {
    const cepValue = form.getValues("cep");
    if (!cepValue) {
        toast({ title: "CEP Vazio", description: "Por favor, insira um CEP.", variant: "default" });
        return;
    }
    const cleanedCep = cepValue.replace(/\D/g, "");
    if (cleanedCep.length !== 8) {
      toast({ title: "CEP Inválido", description: "CEP deve conter 8 dígitos.", variant: "destructive" });
      return;
    }

    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data: ViaCepResponse = await response.json();
      if (data.erro) {
        toast({ title: "CEP Não Encontrado", description: "O CEP informado não foi encontrado.", variant: "destructive" });
        form.setValue("street", "");
        form.setValue("neighborhood", "");
        form.setValue("city", "");
        form.setValue("state", "");
        form.setValue("complement", "");
      } else {
        form.setValue("street", data.logradouro || "");
        form.setValue("neighborhood", data.bairro || "");
        form.setValue("city", data.localidade || "");
        form.setValue("state", data.uf || "");
        form.setValue("complement", data.complemento || "");
        toast({ title: "Endereço Encontrado", description: "Os campos de endereço foram preenchidos." });
      }
    } catch (error) {
      toast({ title: "Erro ao Buscar CEP", description: "Não foi possível buscar o endereço. Verifique sua conexão.", variant: "destructive" });
    } finally {
      setIsCepLoading(false);
    }
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      form.reset(customer);
    } else {
      setEditingCustomer(null);
      form.reset({
        name: "", cnpj: "", email: "", cep: "", street: "", number: "",
        complement: "", neighborhood: "", city: "", state: "",
        preferredTechnician: "", notes: ""
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof CustomerSchema>) => {
    if (editingCustomer && editingCustomer.id) {
      updateCustomerMutation.mutate({ ...values, id: editingCustomer.id });
    } else {
      addCustomerMutation.mutate(values);
    }
  };
  
  const handleModalDeleteConfirm = () => {
    if (editingCustomer && editingCustomer.id) {
       if (window.confirm(`Tem certeza que deseja excluir o cliente "${editingCustomer.name}"?`)) {
        deleteCustomerMutation.mutate(editingCustomer.id);
      }
    }
  };
  
  const isMutating = addCustomerMutation.isPending || updateCustomerMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando clientes...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Clientes</h2>
        <p className="text-center">Não foi possível buscar os dados dos clientes. Tente novamente mais tarde.</p>
        <p className="text-sm mt-2">Detalhe: {error?.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Clientes" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90" disabled={isMutating || deleteCustomerMutation.isPending}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Cliente
          </Button>
        } 
      />

      {customers.length === 0 && !isLoading ? (
        <DataTablePlaceholder
          icon={Users}
          title="Nenhum Cliente Ainda"
          description="Comece adicionando seu primeiro cliente."
          buttonLabel="Adicionar Cliente"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <Card 
              key={customer.id} 
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => openModal(customer)}
            >
              <CardHeader>
                <CardTitle className="font-headline text-xl">{customer.name}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />{customer.cnpj}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-start">
                  <MapPin className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> 
                  {formatAddressForDisplay(customer)}
                </p>
                {customer.cep && <p className="text-xs text-muted-foreground ml-6">CEP: {customer.cep}</p>}
                <p className="flex items-center"><Mail className="mr-2 h-4 w-4 text-primary" /> {customer.email}</p>
                {customer.preferredTechnician && <p className="flex items-center"><HardHat className="mr-2 h-4 w-4 text-primary" /> Técnico Pref.: {customer.preferredTechnician}</p>}
                {customer.notes && <p className="flex items-start"><FileText className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> Obs: {customer.notes}</p>}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); openModal(customer);}} 
                  disabled={isMutating || deleteCustomerMutation.isPending}
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCustomer ? "Editar Cliente" : "Adicionar Novo Cliente"}
        description="Preencha os detalhes do cliente."
        formId="customer-form"
        isSubmitting={isMutating}
        editingItem={editingCustomer}
        onDeleteConfirm={editingCustomer ? handleModalDeleteConfirm : undefined}
        isDeleting={deleteCustomerMutation.isPending}
        deleteButtonLabel="Excluir Cliente"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="customer-form" className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo do cliente ou razão social" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="cnpj" render={({ field }) => (
              <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="contato@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <h3 className="text-md font-semibold pt-2 border-b pb-1 font-headline">Endereço</h3>
            
            <FormField control={form.control} name="cep" render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input placeholder="00000-000" {...field} value={field.value ?? ""} onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 5) {
                        field.onChange(value);
                      } else if (value.length <= 8) {
                        field.onChange(`${value.slice(0,5)}-${value.slice(5)}`);
                      } else {
                        field.onChange(`${value.slice(0,5)}-${value.slice(5,8)}`);
                      }
                    }}/>
                  </FormControl>
                  <Button type="button" variant="outline" onClick={handleSearchCep} disabled={isCepLoading}>
                    {isCepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2 sm:inline hidden">Buscar</span>
                  </Button>
                </div>
                <FormDescription>Digite o CEP para buscar o endereço automaticamente.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="street" render={({ field }) => (
              <FormItem><FormLabel>Rua / Logradouro</FormLabel><FormControl><Input placeholder="Ex: Av. Paulista" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="number" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>Número</FormLabel><FormControl><Input placeholder="Ex: 123" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="complement" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Ex: Apto 10, Bloco B" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="neighborhood" render={({ field }) => (
              <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Ex: Bela Vista" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Ex: São Paulo" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>Estado (UF)</FormLabel><FormControl><Input placeholder="Ex: SP" maxLength={2} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            <h3 className="text-md font-semibold pt-2 border-b pb-1 font-headline">Outras Informações</h3>
            <FormField control={form.control} name="preferredTechnician" render={({ field }) => (
              <FormItem><FormLabel>Técnico Preferencial (Opcional)</FormLabel><FormControl><Input placeholder="Nome do técnico" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Quaisquer observações relevantes sobre o cliente" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

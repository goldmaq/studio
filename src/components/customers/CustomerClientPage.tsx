
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Users, Edit2, Trash2, FileText, MapPin, Mail, Building, HardHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Customer } from "@/types";
import { CustomerSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

export function CustomerClientPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof CustomerSchema>>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      name: "",
      address: "",
      cnpj: "",
      email: "",
      preferredTechnician: "",
      notes: "",
    },
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        const customersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(customersData);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        toast({ title: "Erro ao Carregar Clientes", description: "Não foi possível buscar os dados dos clientes.", variant: "destructive" });
      }
      setIsLoading(false);
    };
    fetchCustomers();
  }, [toast]);

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      form.reset(customer);
    } else {
      setEditingCustomer(null);
      form.reset({ name: "", address: "", cnpj: "", email: "", preferredTechnician: "", notes: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof CustomerSchema>) => {
    try {
      if (editingCustomer) {
        const customerRef = doc(db, "customers", editingCustomer.id);
        await updateDoc(customerRef, values);
        setCustomers(customers.map((c) => (c.id === editingCustomer.id ? { ...c, ...values } : c)));
        toast({ title: "Cliente Atualizado", description: `${values.name} foi atualizado.` });
      } else {
        const docRef = await addDoc(collection(db, "customers"), values);
        setCustomers([...customers, { id: docRef.id, ...values }]);
        toast({ title: "Cliente Criado", description: `${values.name} foi adicionado.` });
      }
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar os dados do cliente.", variant: "destructive" });
    }
  };

  const handleDelete = async (customerId: string) => {
    try {
      await deleteDoc(doc(db, "customers", customerId));
      setCustomers(customers.filter(c => c.id !== customerId));
      toast({ title: "Cliente Excluído", description: "O cliente foi excluído.", variant: "default" });
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o cliente.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando clientes...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Clientes" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Cliente
          </Button>
        } 
      />

      {customers.length === 0 ? (
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
            <Card key={customer.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{customer.name}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />{customer.cnpj}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-start"><MapPin className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> {customer.address}</p>
                <p className="flex items-center"><Mail className="mr-2 h-4 w-4 text-primary" /> {customer.email}</p>
                {customer.preferredTechnician && <p className="flex items-center"><HardHat className="mr-2 h-4 w-4 text-primary" /> Técnico Pref.: {customer.preferredTechnician}</p>}
                {customer.notes && <p className="flex items-start"><FileText className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> Obs: {customer.notes}</p>}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(customer)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(customer.id)}>
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
        title={editingCustomer ? "Editar Cliente" : "Adicionar Novo Cliente"}
        description="Preencha os detalhes do cliente."
        formId="customer-form"
        isSubmitting={form.formState.isSubmitting}
        editingItem={editingCustomer}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="customer-form" className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Nome completo do cliente ou razão social" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl><Input placeholder="Endereço completo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="contato@exemplo.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferredTechnician"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnico Preferencial (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Nome do técnico" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Quaisquer observações relevantes sobre o cliente" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

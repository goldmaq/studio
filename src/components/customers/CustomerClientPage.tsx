"use client";

import { useState, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Users, Edit2, Trash2, FileText, MapPin, Mail, Building, HardHat } from "lucide-react";
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

const initialCustomers: Customer[] = [
  { id: "1", name: "Cliente Alpha Ltda.", address: "Rua das Palmeiras, 123, São Paulo, SP", cnpj: "11.222.333/0001-44", email: "contato@alpha.com", preferredTechnician: "Carlos Silva", notes: "Cliente VIP, priorizar atendimentos."},
  { id: "2", name: "Indústria Beta S.A.", address: "Av. Industrial, 456, Contagem, MG", cnpj: "44.555.666/0001-77", email: "compras@beta.ind.br", notes: "Contrato de manutenção mensal."},
];

export function CustomerClientPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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

  const onSubmit = (values: z.infer<typeof CustomerSchema>) => {
    if (editingCustomer) {
      setCustomers(customers.map((c) => (c.id === editingCustomer.id ? { ...c, ...values } : c)));
      toast({ title: "Cliente Atualizado", description: `${values.name} foi atualizado.` });
    } else {
      setCustomers([...customers, { id: String(Date.now()), ...values }]);
      toast({ title: "Cliente Criado", description: `${values.name} foi adicionado.` });
    }
    closeModal();
  };

  const handleDelete = (customerId: string) => {
    setCustomers(customers.filter(c => c.id !== customerId));
    toast({ title: "Cliente Excluído", description: "O cliente foi excluído.", variant: "destructive" });
  };

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
                  <FormControl><Input placeholder="Nome do técnico" {...field} /></FormControl>
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
                  <FormControl><Textarea placeholder="Quaisquer observações relevantes sobre o cliente" {...field} /></FormControl>
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

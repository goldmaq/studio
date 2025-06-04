
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, HardHat, Edit2, Trash2, UserCircle, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Technician } from "@/types";
import { TechnicianSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

const FIRESTORE_COLLECTION_NAME = "tecnicos";

export function TechnicianClientPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof TechnicianSchema>>({
    resolver: zodResolver(TechnicianSchema),
    defaultValues: { name: "", employeeId: "", specialization: "" },
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, FIRESTORE_COLLECTION_NAME));
        const techniciansData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));
        setTechnicians(techniciansData);
      } catch (error) {
        console.error("Erro ao buscar técnicos:", error);
        toast({ title: "Erro ao Carregar Técnicos", description: "Não foi possível buscar os dados dos técnicos.", variant: "destructive" });
      }
      setIsLoading(false);
    };
    fetchTechnicians();
  }, [toast]);

  const openModal = (technician?: Technician) => {
    if (technician) {
      setEditingTechnician(technician);
      form.reset(technician);
    } else {
      setEditingTechnician(null);
      form.reset({ name: "", employeeId: "", specialization: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTechnician(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof TechnicianSchema>) => {
    try {
      if (editingTechnician) {
        const techRef = doc(db, FIRESTORE_COLLECTION_NAME, editingTechnician.id);
        await updateDoc(techRef, values);
        setTechnicians(technicians.map((t) => (t.id === editingTechnician.id ? { ...t, ...values } : t)));
        toast({ title: "Técnico Atualizado", description: `${values.name} foi atualizado.` });
      } else {
        const docRef = await addDoc(collection(db, FIRESTORE_COLLECTION_NAME), values);
        setTechnicians([...technicians, { id: docRef.id, ...values }]);
        toast({ title: "Técnico Adicionado", description: `${values.name} foi adicionado.` });
      }
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar técnico:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar os dados do técnico.", variant: "destructive" });
    }
  };

  const handleDelete = async (technicianId: string) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTION_NAME, technicianId));
      setTechnicians(technicians.filter(t => t.id !== technicianId));
      toast({ title: "Técnico Excluído", description: "O técnico foi removido.", variant: "default" });
    } catch (error) {
      console.error("Erro ao excluir técnico:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o técnico.", variant: "destructive" });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando técnicos...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Cadastro de Técnicos"
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Técnico
          </Button>
        }
      />

      {technicians.length === 0 ? (
        <DataTablePlaceholder
          icon={HardHat}
          title="Nenhum Técnico Cadastrado"
          description="Adicione seu primeiro técnico ao cadastro."
          buttonLabel="Adicionar Técnico"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((tech) => (
            <Card key={tech.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <UserCircle className="w-10 h-10 text-primary" />
                  <div>
                    <CardTitle className="font-headline text-xl">{tech.name}</CardTitle>
                    <CardDescription>Matrícula: {tech.employeeId}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                {tech.specialization && <p className="flex items-center"><Wrench className="mr-2 h-4 w-4 text-primary" /> Especialização: {tech.specialization}</p>}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(tech)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(tech.id)}>
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
        title={editingTechnician ? "Editar Técnico" : "Adicionar Novo Técnico"}
        description="Insira os detalhes do técnico."
        formId="technician-form"
        isSubmitting={form.formState.isSubmitting}
        editingItem={editingTechnician}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="technician-form" className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo do técnico" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="employeeId" render={({ field }) => (
              <FormItem><FormLabel>Matrícula</FormLabel><FormControl><Input placeholder="Identificador único do funcionário" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="specialization" render={({ field }) => (
              <FormItem><FormLabel>Especialização (Opcional)</FormLabel><FormControl><Input placeholder="ex: Hidráulica, Elétrica" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, HardHat, Edit2, Trash2, UserCircle, Briefcase, Wrench } from "lucide-react";
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

const initialTechnicians: Technician[] = [
  { id: "tech1", name: "Carlos Silva", employeeId: "EMP001", specialization: "Motores de Empilhadeira" },
  { id: "tech2", name: "Mariana Costa", employeeId: "EMP002", specialization: "Sistemas Hidráulicos e Elétricos" },
];

export function TechnicianClientPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof TechnicianSchema>>({
    resolver: zodResolver(TechnicianSchema),
    defaultValues: { name: "", employeeId: "", specialization: "" },
  });

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

  const onSubmit = (values: z.infer<typeof TechnicianSchema>) => {
    if (editingTechnician) {
      setTechnicians(technicians.map((t) => (t.id === editingTechnician.id ? { ...t, ...values } : t)));
      toast({ title: "Técnico Atualizado", description: `${values.name} foi atualizado.` });
    } else {
      setTechnicians([...technicians, { id: String(Date.now()), ...values }]);
      toast({ title: "Técnico Adicionado", description: `${values.name} foi adicionado.` });
    }
    closeModal();
  };

  const handleDelete = (technicianId: string) => {
    setTechnicians(technicians.filter(t => t.id !== technicianId));
    toast({ title: "Técnico Excluído", description: "O técnico foi removido.", variant: "destructive" });
  };

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
                {/* Add assignments display here if needed */}
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
              <FormItem><FormLabel>Especialização (Opcional)</FormLabel><FormControl><Input placeholder="ex: Hidráulica, Elétrica" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

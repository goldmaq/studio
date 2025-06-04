"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, Construction, Edit2, Trash2, Tag, Layers, CalendarDays, CheckCircle, XCircle, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Equipment } from "@/types";
import { EquipmentSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";

const initialEquipment: Equipment[] = [
  { id: "eq1", brand: "Toyota", model: "8FGCU25", chassisNumber: "TY0012345", equipmentType: "Forklift", manufactureYear: 2021, operationalStatus: "Operational", customerId: "1" },
  { id: "eq2", brand: "Hyster", model: "H50FT", chassisNumber: "HY0067890", equipmentType: "Forklift", manufactureYear: 2019, operationalStatus: "Needs Repair", customerId: "2" },
];

const statusOptions: Equipment['operationalStatus'][] = ['Operational', 'Needs Repair', 'Out of Service'];
const statusIcons = {
  Operational: <CheckCircle className="h-4 w-4 text-green-500" />,
  'Needs Repair': <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  'Out of Service': <XCircle className="h-4 w-4 text-red-500" />,
};


export function EquipmentClientPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(initialEquipment);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof EquipmentSchema>>({
    resolver: zodResolver(EquipmentSchema),
    defaultValues: {
      brand: "",
      model: "",
      chassisNumber: "",
      equipmentType: "",
      manufactureYear: new Date().getFullYear(),
      operationalStatus: "Operational",
      customerId: "",
    },
  });

  const openModal = (equipment?: Equipment) => {
    if (equipment) {
      setEditingEquipment(equipment);
      form.reset(equipment);
    } else {
      setEditingEquipment(null);
      form.reset({ brand: "", model: "", chassisNumber: "", equipmentType: "", manufactureYear: new Date().getFullYear(), operationalStatus: "Operational", customerId: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    form.reset();
  };

  const onSubmit = (values: z.infer<typeof EquipmentSchema>) => {
    if (editingEquipment) {
      setEquipmentList(equipmentList.map((eq) => (eq.id === editingEquipment.id ? { ...eq, ...values } : eq)));
      toast({ title: "Equipment Updated", description: `${values.brand} ${values.model} updated.` });
    } else {
      setEquipmentList([...equipmentList, { id: String(Date.now()), ...values }]);
      toast({ title: "Equipment Created", description: `${values.brand} ${values.model} added.` });
    }
    closeModal();
  };

  const handleDelete = (equipmentId: string) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== equipmentId));
    toast({ title: "Equipment Deleted", description: "The equipment has been deleted.", variant: "destructive" });
  };

  return (
    <>
      <PageHeader 
        title="Equipment Tracking" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Equipment
          </Button>
        }
      />

      {equipmentList.length === 0 ? (
        <DataTablePlaceholder
          icon={Construction}
          title="No Equipment Registered"
          description="Add your first piece of equipment to start tracking."
          buttonLabel="Add Equipment"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipmentList.map((eq) => (
            <Card key={eq.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{eq.brand} {eq.model}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" /> Chassis: {eq.chassisNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><Layers className="mr-2 h-4 w-4 text-primary" /> Type: {eq.equipmentType}</p>
                <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" /> Year: {eq.manufactureYear}</p>
                <p className="flex items-center">
                  {statusIcons[eq.operationalStatus]} <span className="ml-2">Status: {eq.operationalStatus}</span>
                </p>
                {eq.customerId && <p className="flex items-center"><User className="mr-2 h-4 w-4 text-primary" /> Customer ID: {eq.customerId}</p>}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(eq)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(eq.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEquipment ? "Edit Equipment" : "Add New Equipment"}
        description="Provide details for the equipment."
        formId="equipment-form"
        isSubmitting={form.formState.isSubmitting}
        editingItem={editingEquipment}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="equipment-form" className="space-y-4">
            <FormField control={form.control} name="brand" render={({ field }) => (
              <FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Toyota" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 8FGCU25" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="chassisNumber" render={({ field }) => (
              <FormItem><FormLabel>Chassis Number</FormLabel><FormControl><Input placeholder="Unique chassis number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="equipmentType" render={({ field }) => (
              <FormItem><FormLabel>Equipment Type</FormLabel><FormControl><Input placeholder="e.g., Forklift, Pallet Jack" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="manufactureYear" render={({ field }) => (
              <FormItem><FormLabel>Manufacture Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2022" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="operationalStatus" render={({ field }) => (
              <FormItem><FormLabel>Operational Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name="customerId" render={({ field }) => (
              <FormItem><FormLabel>Customer ID (Optional)</FormLabel><FormControl><Input placeholder="Link to customer if applicable" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

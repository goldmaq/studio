"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { PlusCircle, ClipboardList, Edit2, Trash2, User, Construction, HardHat, CarFront, Settings2, DollarSign, Calendar, FileText, Play, Pause, Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ServiceOrder } from "@/types";
import { ServiceOrderSchema } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTablePlaceholder } from "@/components/shared/DataTablePlaceholder";
import { FormModal } from "@/components/shared/FormModal";
import { useToast } from "@/hooks/use-toast";

const initialServiceOrders: ServiceOrder[] = [
  { id: "so1", orderNumber: "SO-2024-001", customerId: "1", equipmentId: "eq1", phase: "In Progress", technicianId: "tech1", natureOfService: "Preventive Maintenance", estimatedLaborCost: 250, description: "Standard 500-hour maintenance check.", startDate: "2024-07-20" },
  { id: "so2", orderNumber: "SO-2024-002", customerId: "2", equipmentId: "eq2", phase: "Pending", technicianId: "tech2", natureOfService: "Corrective Repair", estimatedLaborCost: 600, description: "Engine not starting, requires diagnostics.", startDate: "2024-07-22" },
];

const phaseOptions: ServiceOrder['phase'][] = ['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Cancelled'];
const phaseIcons = {
  Pending: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  'In Progress': <Play className="h-4 w-4 text-blue-500" />,
  'Awaiting Parts': <Pause className="h-4 w-4 text-orange-500" />,
  Completed: <Check className="h-4 w-4 text-green-500" />,
  Cancelled: <X className="h-4 w-4 text-red-500" />,
};


export function ServiceOrderClientPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(initialServiceOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof ServiceOrderSchema>>({
    resolver: zodResolver(ServiceOrderSchema),
    defaultValues: {
      orderNumber: "", customerId: "", equipmentId: "", phase: "Pending", technicianId: "",
      natureOfService: "", vehicleId: "", estimatedLaborCost: 0, description: "", notes: "",
      startDate: new Date().toISOString().split('T')[0], endDate: ""
    },
  });

  const openModal = (order?: ServiceOrder) => {
    if (order) {
      setEditingOrder(order);
      form.reset({
        ...order,
        startDate: order.startDate ? new Date(order.startDate).toISOString().split('T')[0] : "",
        endDate: order.endDate ? new Date(order.endDate).toISOString().split('T')[0] : "",
      });
    } else {
      setEditingOrder(null);
      form.reset({
        orderNumber: `SO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, 
        customerId: "", equipmentId: "", phase: "Pending", technicianId: "",
        natureOfService: "", vehicleId: "", estimatedLaborCost: 0, description: "", notes: "",
        startDate: new Date().toISOString().split('T')[0], endDate: ""
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    form.reset();
  };

  const onSubmit = (values: z.infer<typeof ServiceOrderSchema>) => {
    if (editingOrder) {
      setServiceOrders(serviceOrders.map((o) => (o.id === editingOrder.id ? { ...editingOrder, ...values } : o)));
      toast({ title: "Service Order Updated", description: `Order ${values.orderNumber} updated.` });
    } else {
      setServiceOrders([...serviceOrders, { id: String(Date.now()), ...values }]);
      toast({ title: "Service Order Created", description: `Order ${values.orderNumber} created.` });
    }
    closeModal();
  };

  const handleDelete = (orderId: string) => {
    setServiceOrders(serviceOrders.filter(o => o.id !== orderId));
    toast({ title: "Service Order Deleted", description: "The service order has been deleted.", variant: "destructive" });
  };

  return (
    <>
      <PageHeader 
        title="Service Orders" 
        actions={
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Service Order
          </Button>
        }
      />

      {serviceOrders.length === 0 ? (
        <DataTablePlaceholder
          icon={ClipboardList}
          title="No Service Orders Yet"
          description="Create your first service order to manage operations."
          buttonLabel="Create Service Order"
          onButtonClick={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceOrders.map((order) => (
            <Card key={order.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Order: {order.orderNumber}</CardTitle>
                <CardDescription className="flex items-center text-sm">
                  {phaseIcons[order.phase]} <span className="ml-2">{order.phase}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <p className="flex items-center"><User className="mr-2 h-4 w-4 text-primary" /> Cust. ID: {order.customerId}</p>
                <p className="flex items-center"><Construction className="mr-2 h-4 w-4 text-primary" /> Equip. ID: {order.equipmentId}</p>
                <p className="flex items-center"><HardHat className="mr-2 h-4 w-4 text-primary" /> Tech. ID: {order.technicianId}</p>
                <p className="flex items-center"><Settings2 className="mr-2 h-4 w-4 text-primary" /> Service: {order.natureOfService}</p>
                <p className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-primary" /> Est. Cost: ${order.estimatedLaborCost.toFixed(2)}</p>
                {order.startDate && <p className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-primary" /> Start: {new Date(order.startDate).toLocaleDateString()}</p>}
                <p className="flex items-start"><FileText className="mr-2 mt-1 h-4 w-4 text-primary flex-shrink-0" /> Desc: {order.description}</p>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openModal(order)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(order.id)}>
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
        title={editingOrder ? "Edit Service Order" : "Create New Service Order"}
        description="Manage the details of the service order."
        formId="service-order-form"
        isSubmitting={form.formState.isSubmitting}
        editingItem={editingOrder}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="service-order-form" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="orderNumber" render={({ field }) => (
                <FormItem><FormLabel>Order Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem><FormLabel>Customer ID</FormLabel><FormControl><Input placeholder="Select Customer" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="equipmentId" render={({ field }) => (
                <FormItem><FormLabel>Equipment ID</FormLabel><FormControl><Input placeholder="Select Equipment" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phase" render={({ field }) => (
                <FormItem><FormLabel>Phase</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger></FormControl>
                    <SelectContent>{phaseOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="technicianId" render={({ field }) => (
                <FormItem><FormLabel>Technician ID</FormLabel><FormControl><Input placeholder="Assign Technician" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="natureOfService" render={({ field }) => (
                <FormItem><FormLabel>Nature of Service</FormLabel><FormControl><Input placeholder="e.g., Preventive Maintenance" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem><FormLabel>Vehicle ID (Optional)</FormLabel><FormControl><Input placeholder="Select Vehicle" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estimatedLaborCost" render={({ field }) => (
                <FormItem><FormLabel>Estimated Labor Cost</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>End Date (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed description of the service" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
      </FormModal>
    </>
  );
}

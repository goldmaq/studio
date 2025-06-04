export interface Customer {
  id: string;
  name: string;
  address: string;
  cnpj: string;
  email: string;
  preferredTechnician?: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  brand: string;
  model: string;
  chassisNumber: string;
  equipmentType: string;
  manufactureYear: number;
  operationalStatus: 'Operational' | 'Needs Repair' | 'Out of Service';
  customerId?: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  equipmentId: string;
  phase: 'Pending' | 'In Progress' | 'Awaiting Parts' | 'Completed' | 'Cancelled';
  technicianId: string;
  natureOfService: string;
  vehicleId?: string;
  estimatedLaborCost: number;
  actualLaborCost?: number;
  startDate?: string; // Using string for form compatibility, can be Date object in logic
  endDate?: string;   // Using string for form compatibility
  description: string;
  notes?: string;
}

export interface Technician {
  id: string;
  name: string;
  employeeId: string;
  specialization?: string;
}

export type CompanyId = 'goldmaq' | 'goldcomercio' | 'goldjob';

export interface Company {
  id: CompanyId;
  name: string;
  cnpj: string;
  address: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankPixKey?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  licensePlate: string;
  kind: string;
  currentMileage: number;
  fuelConsumption: number;
  costPerKilometer: number;
  registrationInfo?: string;
  status: 'Available' | 'In Use' | 'Maintenance';
}

// Schemas for react-hook-form validation using Zod
import { z } from 'zod';

export const CustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  cnpj: z.string().min(1, "CNPJ is required"), // Add CNPJ validation if needed
  email: z.string().email("Invalid email address"),
  preferredTechnician: z.string().optional(),
  notes: z.string().optional(),
});

export const EquipmentSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  chassisNumber: z.string().min(1, "Chassis number is required"),
  equipmentType: z.string().min(1, "Equipment type is required"),
  manufactureYear: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear() + 1, "Invalid year"),
  operationalStatus: z.enum(['Operational', 'Needs Repair', 'Out of Service']),
  customerId: z.string().optional(),
});

export const TechnicianSchema = z.object({
  name: z.string().min(1, "Name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  specialization: z.string().optional(),
});

export const VehicleSchema = z.object({
  model: z.string().min(1, "Model is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  kind: z.string().min(1, "Kind of vehicle is required"),
  currentMileage: z.coerce.number().min(0, "Mileage must be positive"),
  fuelConsumption: z.coerce.number().min(0, "Fuel consumption must be positive"),
  costPerKilometer: z.coerce.number().min(0, "Cost per kilometer must be positive"),
  registrationInfo: z.string().optional(),
  status: z.enum(['Available', 'In Use', 'Maintenance']),
});

export const ServiceOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  customerId: z.string().min(1, "Customer is required"),
  equipmentId: z.string().min(1, "Equipment is required"),
  phase: z.enum(['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Cancelled']),
  technicianId: z.string().min(1, "Technician is required"),
  natureOfService: z.string().min(1, "Nature of service is required"),
  vehicleId: z.string().optional(),
  estimatedLaborCost: z.coerce.number().min(0, "Estimated cost must be positive"),
  actualLaborCost: z.coerce.number().min(0, "Actual cost must be positive").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
});

export const CompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  cnpj: z.string().min(1, "CNPJ is required"),
  address: z.string().min(1, "Address is required"),
  bankName: z.string().optional(),
  bankAgency: z.string().optional(),
  bankAccount: z.string().optional(),
  bankPixKey: z.string().optional(),
});

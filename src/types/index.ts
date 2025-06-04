
export interface Customer {
  id: string;
  name: string;
  address: string;
  cnpj: string;
  email: string;
  cep?: string; // Adicionado campo CEP
  preferredTechnician?: string;
  notes?: string;
}

export interface Equipment {
  id:string;
  brand: string;
  model: string;
  chassisNumber: string;
  equipmentType: string;
  manufactureYear: number;
  operationalStatus: 'Operacional' | 'Precisa de Reparo' | 'Fora de Serviço';
  customerId?: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  equipmentId: string;
  phase: 'Pendente' | 'Em Progresso' | 'Aguardando Peças' | 'Concluída' | 'Cancelada';
  technicianId: string;
  natureOfService: string;
  vehicleId?: string;
  estimatedLaborCost: number;
  actualLaborCost?: number;
  startDate?: string; 
  endDate?: string;   
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
  status: 'Disponível' | 'Em Uso' | 'Manutenção';
}

// Schemas for react-hook-form validation using Zod
import { z } from 'zod';

export const CustomerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"), 
  email: z.string().email("Endereço de email inválido"),
  cep: z.string().optional().nullable().transform(val => val === "" ? null : val), // CEP é opcional
  preferredTechnician: z.string().optional(),
  notes: z.string().optional(),
});

export const EquipmentSchema = z.object({
  brand: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatório"),
  chassisNumber: z.string().min(1, "Número do chassi é obrigatório"),
  equipmentType: z.string().min(1, "Tipo de equipamento é obrigatório"),
  manufactureYear: z.coerce.number().min(1900, "Ano inválido").max(new Date().getFullYear() + 1, "Ano inválido"),
  operationalStatus: z.enum(['Operacional', 'Precisa de Reparo', 'Fora de Serviço']),
  customerId: z.string().optional(),
});

export const TechnicianSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  employeeId: z.string().min(1, "Matrícula é obrigatória"),
  specialization: z.string().optional(),
});

export const VehicleSchema = z.object({
  model: z.string().min(1, "Modelo é obrigatório"),
  licensePlate: z.string().min(1, "Placa é obrigatória"),
  kind: z.string().min(1, "Tipo de veículo é obrigatório"),
  currentMileage: z.coerce.number().min(0, "Quilometragem deve ser positiva"),
  fuelConsumption: z.coerce.number().min(0, "Consumo de combustível deve ser positivo"),
  costPerKilometer: z.coerce.number().min(0, "Custo por quilômetro deve ser positivo"),
  registrationInfo: z.string().optional(),
  status: z.enum(['Disponível', 'Em Uso', 'Manutenção']),
});

export const ServiceOrderSchema = z.object({
  orderNumber: z.string().min(1, "Número da ordem é obrigatório"),
  customerId: z.string().min(1, "Cliente é obrigatório"),
  equipmentId: z.string().min(1, "Equipamento é obrigatório"),
  phase: z.enum(['Pendente', 'Em Progresso', 'Aguardando Peças', 'Concluída', 'Cancelada']),
  technicianId: z.string().min(1, "Técnico é obrigatório"),
  natureOfService: z.string().min(1, "Natureza do serviço é obrigatória"),
  vehicleId: z.string().optional(),
  estimatedLaborCost: z.coerce.number().min(0, "Custo estimado deve ser positivo"),
  actualLaborCost: z.coerce.number().min(0, "Custo real deve ser positivo").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().min(1, "Descrição é obrigatória"),
  notes: z.string().optional(),
});

export const CompanySchema = z.object({
  name: z.string().min(1, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  bankName: z.string().optional(),
  bankAgency: z.string().optional(),
  bankAccount: z.string().optional(),
  bankPixKey: z.string().optional(),
});

// Types basés sur le schéma Prisma
export enum Currency {
  USD = "USD",
  CDF = "CDF",
}

// Types pour les opérations CRUD
export type CreateUser = {
  email: string;
  password: string;
};

export type CreateProduct = {
  name: string;
  purchaseUnit: string;
  saleUnit: string;
  conversionFactor: number;
  stock: number;
};

export type CreatePurchase = {
  supplier?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: Currency;
};

export type CreateSale = {
  customerId?: string;
  items: CreateSaleItem[];
  total: number;
  currency: Currency;
  isCredit: boolean;
};

export type CreateSaleItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  saleUnit: string;
};

export type CreateCustomer = {
  name: string;
  phone?: string;
};

export type CreatePayment = {
  customerId: string;
  amount: number;
  currency: Currency;
};

export type CreateExpense = {
  description: string;
  amount: number;
  currency: Currency;
};

export type CreateExchangeRate = {
  date: Date;
  usdToCdf: number;
  cdfToUsd: number;
};

// Types pour les réponses avec relations
export type ProductWithRelations = {
  id: string;
  name: string;
  purchaseUnit: string;
  saleUnit: string;
  conversionFactor: number;
  stock: number;
  createdAt: Date;
  purchases: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    currency: Currency;
    createdAt: Date;
  }>;
  saleItems: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    saleUnit: string;
  }>;
};

export type SaleWithRelations = {
  id: string;
  invoiceNumber: string | null;
  customerId: string | null;
  total: number;
  currency: Currency;
  isCredit: boolean;
  createdAt: Date;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    saleUnit: string;
    product: {
      id: string;
      name: string;
      purchaseUnit: string;
      saleUnit: string;
      conversionFactor: number;
    };
  }>;
};

export type CustomerWithRelations = {
  id: string;
  name: string;
  phone: string | null;
  sales: Array<{
    id: string;
    total: number;
    currency: Currency;
    isCredit: boolean;
    createdAt: Date;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: Currency;
    createdAt: Date;
  }>;
};

// Types pour les calculs de dette
export type CustomerDebt = {
  usd: number;
  cdf: number;
};

export type ProductStockInfo = {
  product: {
    id: string;
    name: string;
    purchaseUnit: string;
    saleUnit: string;
    conversionFactor: number;
    stock: number;
  };
  stockInSaleUnits: number;
  stockInPurchaseUnits: number;
  remainingInSaleUnits: number;
  displayText: string;
};

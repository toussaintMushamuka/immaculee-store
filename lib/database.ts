import { prisma } from "./prisma";
import { Currency } from "./types";
import type {
  CreateUser,
  CreateProduct,
  CreatePurchase,
  CreateSale,
  CreateSaleItem,
  CreateCustomer,
  CreatePayment,
  CreateExpense,
  CreateExchangeRate,
  ProductWithRelations,
  SaleWithRelations,
  CustomerWithRelations,
  CustomerDebt,
  ProductStockInfo,
} from "./types";

// User operations
export const getUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (data: CreateUser) => {
  return await prisma.user.create({
    data,
  });
};

// Product operations
export const getProducts = async (): Promise<ProductWithRelations[]> => {
  return await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      purchaseUnit: true,
      saleUnit: true,
      conversionFactor: true,
      stock: true,
      purchaseUnitPrice: true,
      purchaseCurrency: true,
      createdAt: true,
      // Relations simplifiées pour les performances
      purchases: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          total: true,
          currency: true,
          createdAt: true,
        },
        take: 5, // Limite à 5 derniers achats
        orderBy: {
          createdAt: "desc",
        },
      },
      saleItems: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          total: true,
          saleUnit: true,
        },
        take: 5, // Limite à 5 dernières ventes
        orderBy: {
          sale: {
            createdAt: "desc",
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
};

export const getProductById = async (id: string) => {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      purchases: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          total: true,
          currency: true,
          createdAt: true,
        },
      },
      saleItems: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          total: true,
          saleUnit: true,
        },
      },
    },
  });
};

export const createProduct = async (data: CreateProduct) => {
  return await prisma.product.create({
    data,
  });
};

export const updateProduct = async (
  id: string,
  data: Partial<CreateProduct>
) => {
  return await prisma.product.update({
    where: { id },
    data,
  });
};

export const deleteProduct = async (id: string) => {
  // First check if the product exists
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Produit non trouvé");
  }

  // Use a transaction to delete all related records first
  return await prisma.$transaction(async (tx) => {
    // Delete all purchases related to this product
    await tx.purchase.deleteMany({
      where: { productId: id },
    });

    // Delete all sale items related to this product
    await tx.saleItem.deleteMany({
      where: { productId: id },
    });

    // Finally delete the product
    return await tx.product.delete({
      where: { id },
    });
  });
};

// Purchase operations
export const getPurchases = async () => {
  return await prisma.purchase.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          purchaseUnit: true,
          saleUnit: true,
          conversionFactor: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const createPurchase = async (data: CreatePurchase) => {
  return await prisma.$transaction(async (tx) => {
    // Create the purchase
    const purchase = await tx.purchase.create({
      data,
    });

    // Update product stock
    const product = await tx.product.findUnique({
      where: { id: data.productId },
    });

    if (product) {
      const stockIncrease = data.quantity * product.conversionFactor;
      await tx.product.update({
        where: { id: data.productId },
        data: {
          stock: {
            increment: stockIncrease,
          },
        },
      });
    }

    return purchase;
  });
};

export const updatePurchase = async (
  id: string,
  data: Partial<CreatePurchase>
) => {
  return await prisma.$transaction(async (tx) => {
    // Get the old purchase to calculate stock adjustment
    const oldPurchase = await tx.purchase.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!oldPurchase || !oldPurchase.product) {
      throw new Error("Achat non trouvé");
    }

    // Update the purchase
    const updatedPurchase = await tx.purchase.update({
      where: { id },
      data,
    });

    // Calculate stock adjustment
    const oldStockIncrease =
      oldPurchase.quantity * oldPurchase.product.conversionFactor;
    const newStockIncrease =
      (data.quantity || oldPurchase.quantity) *
      oldPurchase.product.conversionFactor;
    const stockDifference = newStockIncrease - oldStockIncrease;

    // Update product stock with the difference
    if (stockDifference !== 0) {
      await tx.product.update({
        where: { id: oldPurchase.productId },
        data: {
          stock: {
            increment: stockDifference,
          },
        },
      });
    }

    return updatedPurchase;
  });
};

export const deletePurchase = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    // Get the purchase to calculate stock adjustment
    const purchase = await tx.purchase.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (purchase && purchase.product) {
      // Decrease stock by the purchase quantity
      const stockDecrease =
        purchase.quantity * purchase.product.conversionFactor;
      await tx.product.update({
        where: { id: purchase.productId },
        data: {
          stock: {
            decrement: stockDecrease,
          },
        },
      });
    }

    // Delete the purchase
    return await tx.purchase.delete({
      where: { id },
    });
  });
};

// Sale operations
export const getSales = async (
  limit?: number
): Promise<SaleWithRelations[]> => {
  return await prisma.sale.findMany({
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              purchaseUnit: true,
              saleUnit: true,
              conversionFactor: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit || 100, // Limite par défaut à 100 ventes
  });
};

export const createSale = async (data: CreateSale) => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Validate that all products exist in a single query
          const productIds = data.items.map((item) => item.productId);
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, purchaseUnit: true, conversionFactor: true },
          });

          if (products.length !== productIds.length) {
            const foundIds = products.map((p) => p.id);
            const missingIds = productIds.filter(
              (id) => !foundIds.includes(id)
            );
            throw new Error(`Produits non trouvés: ${missingIds.join(", ")}`);
          }

          // Create a map for quick product lookup
          const productMap = new Map(products.map((p) => [p.id, p]));

          // Generate invoice number
          const invoiceNumber = `INV-${Date.now()}`;

          // Calculate totals by currency
          const totalUSD = data.items
            .filter((item) => item.currency === Currency.USD)
            .reduce((sum, item) => sum + item.total, 0);

          const totalCDF = data.items
            .filter((item) => item.currency === Currency.CDF)
            .reduce((sum, item) => sum + item.total, 0);

          // Determine primary currency (the one with the highest total)
          const primaryCurrency =
            totalUSD >= totalCDF ? Currency.USD : Currency.CDF;
          const primaryTotal =
            primaryCurrency === Currency.USD ? totalUSD : totalCDF;

          // Create the sale first
          const sale = await tx.sale.create({
            data: {
              customerId: data.customerId,
              total: primaryTotal,
              currency: primaryCurrency,
              totalUSD: totalUSD > 0 ? totalUSD : null,
              totalCDF: totalCDF > 0 ? totalCDF : null,
              isCredit: data.isCredit,
              invoiceNumber,
            },
          });

          // Create all sale items at once
          const saleItemsData = data.items.map((item) => ({
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            saleUnit: item.saleUnit,
            currency: item.currency,
          }));

          await tx.saleItem.createMany({
            data: saleItemsData,
          });

          // Update product stocks efficiently using the product map
          const stockUpdates = data.items
            .map((item) => {
              const product = productMap.get(item.productId);
              if (!product) return null;

              let quantityInSaleUnits = item.quantity;
              if (item.saleUnit === "purchase") {
                // Si on vend en unité d'achat (bidons), on multiplie par le facteur de conversion
                quantityInSaleUnits = item.quantity * product.conversionFactor;
              }
              // Si on vend en unité de vente (litres), on garde la quantité telle quelle

              return {
                where: { id: item.productId },
                data: { stock: { decrement: quantityInSaleUnits } },
              };
            })
            .filter(Boolean);

          // Execute all stock updates in parallel
          await Promise.all(
            stockUpdates.map((update) =>
              update ? tx.product.update(update) : Promise.resolve()
            )
          );

          // Return the sale with relations
          return await tx.sale.findUnique({
            where: { id: sale.id },
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      purchaseUnit: true,
                      saleUnit: true,
                      conversionFactor: true,
                    },
                  },
                },
              },
            },
          });
        },
        {
          maxWait: 10000, // 10 secondes
          timeout: 30000, // 30 secondes
        }
      );
    } catch (error) {
      lastError = error as Error;
      console.error(`Tentative ${attempt}/${maxRetries} échouée:`, error);

      if (attempt < maxRetries) {
        // Attendre avant de réessayer (backoff exponentiel)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Attente de ${delay}ms avant la prochaine tentative...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Si toutes les tentatives ont échoué
  throw new Error(
    `Échec de création de vente après ${maxRetries} tentatives. Dernière erreur: ${lastError?.message}`
  );
};

export const updateSale = async (
  id: string,
  data: {
    customerId?: string | null;
    isCredit?: boolean;
    items?: CreateSaleItem[];
  }
) => {
  return await prisma.$transaction(async (tx) => {
    // Get the current sale with items to calculate stock adjustments
    const currentSale = await tx.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!currentSale) {
      throw new Error("Vente non trouvée");
    }

    // Restore stock from current sale items
    for (const item of currentSale.items) {
      if (item.product) {
        let quantityInSaleUnits = item.quantity;
        if (item.saleUnit === "purchase") {
          // Si on vendait en unité d'achat (bidons), on multiplie par le facteur de conversion
          quantityInSaleUnits = item.quantity * item.product.conversionFactor;
        }
        // Si on vendait en unité de vente (litres), on garde la quantité telle quelle

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: quantityInSaleUnits,
            },
          },
        });
      }
    }

    // Delete current sale items
    await tx.saleItem.deleteMany({
      where: { saleId: id },
    });

    // Update the sale
    const updatedSale = await tx.sale.update({
      where: { id },
      data: {
        customerId: data.customerId,
        isCredit: data.isCredit,
        total: data.items
          ? data.items.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0
            )
          : currentSale.total,
      },
    });

    // Add new items and update stock
    if (data.items && data.items.length > 0) {
      // Create new sale items
      await tx.saleItem.createMany({
        data: data.items.map((item) => ({
          ...item,
          saleId: id,
        })),
      });

      // Update product stocks
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          let quantityInSaleUnits = item.quantity;
          if (item.saleUnit === "purchase") {
            // Si on vendait en unité d'achat (bidons), on multiplie par le facteur de conversion
            quantityInSaleUnits = item.quantity * product.conversionFactor;
          }
          // Si on vendait en unité de vente (litres), on garde la quantité telle quelle

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: quantityInSaleUnits,
              },
            },
          });
        }
      }
    }

    // Return the updated sale with relations
    return await tx.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                purchaseUnit: true,
                saleUnit: true,
                conversionFactor: true,
              },
            },
          },
        },
      },
    });
  });
};

export const deleteSale = async (id: string) => {
  return await prisma.$transaction(
    async (tx) => {
      // Get the sale with items to calculate stock adjustment
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!sale) {
        throw new Error("Vente non trouvée");
      }

      if (sale.items && sale.items.length > 0) {
        // Prepare stock updates in parallel
        const stockUpdates = sale.items
          .filter((item) => item.product)
          .map((item) => {
            let quantityInSaleUnits = item.quantity;
            if (item.saleUnit === "purchase") {
              // Si on vendait en unité d'achat (bidons), on multiplie par le facteur de conversion
              quantityInSaleUnits =
                item.quantity * item.product!.conversionFactor;
            }
            // Si on vendait en unité de vente (litres), on garde la quantité telle quelle

            return tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: quantityInSaleUnits,
                },
              },
            });
          });

        // Execute stock updates and sale items deletion in parallel
        await Promise.all([
          ...stockUpdates,
          tx.saleItem.deleteMany({
            where: { saleId: id },
          }),
        ]);
      }

      // Delete the sale
      return await tx.sale.delete({
        where: { id },
      });
    },
    {
      maxWait: 10000, // 10 secondes
      timeout: 30000, // 30 secondes
    }
  );
};

// Customer operations
export const getCustomers = async (): Promise<CustomerWithRelations[]> => {
  const customers = await prisma.customer.findMany({
    include: {
      sales: {
        select: {
          id: true,
          total: true,
          currency: true,
          isCredit: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  // Trier par nombre de ventes (du plus grand au plus petit)
  return customers.sort((a, b) => b.sales.length - a.sales.length);
};

export const getCustomerById = async (id: string) => {
  return await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        select: {
          id: true,
          total: true,
          currency: true,
          isCredit: true,
          createdAt: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      },
    },
  });
};

export const createCustomer = async (data: CreateCustomer) => {
  return await prisma.customer.create({
    data,
  });
};

// Payment operations
export const getPayments = async () => {
  return await prisma.payment.findMany({
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getPaymentsByCustomer = async (customerId: string) => {
  return await prisma.payment.findMany({
    where: { customerId },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const createPayment = async (data: CreatePayment) => {
  return await prisma.payment.create({
    data,
  });
};

// Expense operations
export const getExpenses = async () => {
  return await prisma.expense.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const createExpense = async (data: CreateExpense) => {
  return await prisma.expense.create({
    data,
  });
};

// Exchange rate operations
export const getExchangeRates = async () => {
  return await prisma.exchangeRate.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getCurrentExchangeRate = async () => {
  return await prisma.exchangeRate.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const createExchangeRate = async (data: CreateExchangeRate) => {
  return await prisma.exchangeRate.create({
    data,
  });
};

// Helper functions
export const getCustomerDebt = async (
  customerId: string
): Promise<CustomerDebt> => {
  const customerSales = await prisma.sale.findMany({
    where: {
      customerId,
      isCredit: true,
    },
    select: {
      total: true,
      currency: true,
    },
  });

  const customerPayments = await prisma.payment.findMany({
    where: { customerId },
    select: {
      amount: true,
      currency: true,
    },
  });

  let totalDebtUSD = 0;
  let totalDebtCDF = 0;
  let totalPaidUSD = 0;
  let totalPaidCDF = 0;

  customerSales.forEach((sale) => {
    if (sale.currency === Currency.USD) {
      totalDebtUSD += sale.total;
    } else {
      totalDebtCDF += sale.total;
    }
  });

  customerPayments.forEach((payment) => {
    if (payment.currency === Currency.USD) {
      totalPaidUSD += payment.amount;
    } else {
      totalPaidCDF += payment.amount;
    }
  });

  return {
    usd: totalDebtUSD - totalPaidUSD,
    cdf: totalDebtCDF - totalPaidCDF,
  };
};

export const getProductStockInfo = async (
  productId: string
): Promise<ProductStockInfo | null> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) return null;

  const stockInSaleUnits = product.stock;
  const stockInPurchaseUnits = Math.floor(
    product.stock / product.conversionFactor
  );
  const remainingInSaleUnits = product.stock % product.conversionFactor;

  return {
    product,
    stockInSaleUnits,
    stockInPurchaseUnits,
    remainingInSaleUnits,
    displayText: `${stockInPurchaseUnits} ${product.purchaseUnit}${
      stockInPurchaseUnits !== 1 ? "s" : ""
    } + ${remainingInSaleUnits} ${product.saleUnit}${
      remainingInSaleUnits !== 1 ? "s" : ""
    }`,
  };
};

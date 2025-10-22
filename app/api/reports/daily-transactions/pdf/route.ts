import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get exchange rate for the day
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        date: {
          lte: endOfDay,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const usdToCdf = exchangeRate?.usdToCdf || 1;

    // Get purchases for the day
    const purchases = await prisma.purchase.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        product: {
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

    // Get sales for the day
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get payments for the day
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
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

    // Get expenses for the day
    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate totals
    const totalPurchasesUSD = purchases.reduce((sum, purchase) => {
      return (
        sum +
        (purchase.currency === Currency.USD
          ? purchase.total
          : purchase.total / usdToCdf)
      );
    }, 0);

    const totalSalesUSD = sales.reduce((sum, sale) => {
      return (
        sum +
        (sale.currency === Currency.USD ? sale.total : sale.total / usdToCdf)
      );
    }, 0);

    const totalPaymentsUSD = payments.reduce((sum, payment) => {
      return (
        sum +
        (payment.currency === Currency.USD
          ? payment.amount
          : payment.amount / usdToCdf)
      );
    }, 0);

    const totalExpensesUSD = expenses.reduce((sum, expense) => {
      return (
        sum +
        (expense.currency === Currency.USD
          ? expense.amount
          : expense.amount / usdToCdf)
      );
    }, 0);

    const netProfit = totalSalesUSD - totalPurchasesUSD - totalExpensesUSD;

    // Combine all transactions into one array
    const allTransactions = [
      ...sales.map((sale) => ({
        type: "Vente",
        reference: sale.invoiceNumber || "N/A",
        description: sale.customer?.name || "Client anonyme",
        amount: sale.total,
        currency: sale.currency,
        time: new Date(sale.createdAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        details: sale.items
          .map(
            (item) => `${item.quantity} ${item.saleUnit} ${item.product.name}`
          )
          .join(", "),
        isCredit: sale.isCredit,
      })),
      ...purchases.map((purchase) => ({
        type: "Achat",
        reference: purchase.product.name,
        description: purchase.supplier || "N/A",
        amount: purchase.total,
        currency: purchase.currency,
        time: new Date(purchase.createdAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        details: `${purchase.quantity} unités × ${
          purchase.currency === "USD" ? "$" : ""
        }${purchase.unitPrice.toFixed(purchase.currency === "USD" ? 2 : 0)}${
          purchase.currency === "CDF" ? " CDF" : ""
        }`,
        isCredit: false,
      })),
      ...payments.map((payment) => ({
        type: "Paiement",
        reference: payment.customer.name,
        description: "Paiement reçu",
        amount: payment.amount,
        currency: payment.currency,
        time: new Date(payment.createdAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        details: "",
        isCredit: false,
      })),
      ...expenses.map((expense) => ({
        type: "Dépense",
        reference: expense.description,
        description: "Dépense",
        amount: expense.amount,
        currency: expense.currency,
        time: new Date(expense.createdAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        details: "",
        isCredit: false,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Generate HTML for PDF
    const html = `
       <!DOCTYPE html>
       <html lang="fr">
       <head>
           <meta charset="UTF-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
           <title>Rapport Journalier - ${targetDate.toLocaleDateString(
             "fr-FR"
           )}</title>
           <style>
               body { 
                   font-family: 'Arial', sans-serif; 
                   margin: 20px; 
                   color: #333; 
                   line-height: 1.6;
               }
               .header { 
                   text-align: center; 
                   margin-bottom: 30px; 
                   border-bottom: 2px solid #e5e7eb;
                   padding-bottom: 20px;
               }
               .header h1 { 
                   color: #1f2937; 
                   margin-bottom: 10px; 
                   font-size: 2rem;
               }
               .header p { 
                   color: #6b7280; 
                   font-size: 1.1rem;
               }
               table { 
                   width: 100%; 
                   border-collapse: collapse; 
                   margin-top: 20px;
               }
               th, td { 
                   border: 1px solid #d1d5db; 
                   padding: 12px; 
                   text-align: left;
               }
               th { 
                   background-color: #f3f4f6; 
                   font-weight: bold; 
                   color: #374151;
               }
               .type-vente { background-color: #dcfce7; }
               .type-achat { background-color: #fef2f2; }
               .type-paiement { background-color: #dbeafe; }
               .type-depense { background-color: #fef3c7; }
               .amount { 
                   font-weight: bold; 
                   text-align: right;
               }
               .credit { 
                   color: #dc2626; 
                   font-weight: bold;
               }
               .footer { 
                   text-align: center; 
                   margin-top: 40px; 
                   padding-top: 20px; 
                   border-top: 1px solid #e5e7eb; 
                   color: #6b7280; 
                   font-size: 0.9rem;
               }
               @media print {
                   body { margin: 0; }
                   .header { margin-bottom: 20px; }
               }
           </style>
       </head>
       <body>
           <div class="header">
               <h1>Rapport Journalier des Transactions</h1>
               <p>Date: ${targetDate.toLocaleDateString("fr-FR")}</p>
               <p>Taux de change: 1 USD = ${usdToCdf.toLocaleString()} CDF</p>
           </div>

           <table>
               <thead>
                   <tr>
                       <th>Type</th>
                       <th>Référence</th>
                       <th>Description</th>
                       <th>Montant</th>
                       <th>Heure</th>
                       <th>Détails</th>
                   </tr>
               </thead>
               <tbody>
                   ${allTransactions
                     .map(
                       (transaction) => `
                       <tr class="type-${transaction.type.toLowerCase()}">
                           <td>${transaction.type}</td>
                           <td>${transaction.reference}</td>
                           <td>${transaction.description}</td>
                           <td class="amount">
                               ${
                                 transaction.currency === "USD" ? "$" : ""
                               }${transaction.amount.toFixed(
                         transaction.currency === "USD" ? 2 : 0
                       )}${transaction.currency === "CDF" ? " CDF" : ""}
                               ${
                                 transaction.isCredit
                                   ? '<br><span class="credit">À crédit</span>'
                                   : ""
                               }
                           </td>
                           <td>${transaction.time}</td>
                           <td>${transaction.details}</td>
                       </tr>
                   `
                     )
                     .join("")}
               </tbody>
           </table>

           <div class="footer">
               <div style="margin-bottom: 20px; padding: 20px; background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
                   <h3 style="margin: 0 0 20px 0; color: #0c4a6e; text-align: center;">Total des Ventes Journalières</h3>
                   
                   <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center;">
                       <!-- Ventes en CDF -->
                       <div style="padding: 15px; background-color: #dbeafe; border-radius: 6px;">
                           <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 0.9rem; font-weight: bold;">Ventes en CDF</p>
                           <div style="font-size: 1.5rem; font-weight: bold; color: #1e40af;">
                               ${sales
                                 .filter((sale) => sale.currency === "CDF")
                                 .reduce((sum, sale) => sum + sale.total, 0)
                                 .toLocaleString()} CDF
                           </div>
                       </div>
                       
                       <!-- Ventes en USD -->
                       <div style="padding: 15px; background-color: #dcfce7; border-radius: 6px;">
                           <p style="margin: 0 0 8px 0; color: #166534; font-size: 0.9rem; font-weight: bold;">Ventes en USD</p>
                           <div style="font-size: 1.5rem; font-weight: bold; color: #166534;">
                               $${sales
                                 .filter((sale) => sale.currency === "USD")
                                 .reduce((sum, sale) => sum + sale.total, 0)
                                 .toFixed(2)}
                           </div>
                       </div>
                       
                       <!-- Total converti en USD -->
                       <div style="padding: 15px; background-color: #fef3c7; border-radius: 6px;">
                           <p style="margin: 0 0 8px 0; color: #92400e; font-size: 0.9rem; font-weight: bold;">Total en USD</p>
                           <div style="font-size: 1.8rem; font-weight: bold; color: #92400e;">
                               $${totalSalesUSD.toFixed(2)}
                           </div>
                       </div>
                   </div>
                   
                   <div style="text-align: center; margin-top: 15px;">
                       <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
                           ${sales.length} vente${
      sales.length > 1 ? "s" : ""
    } enregistrée${sales.length > 1 ? "s" : ""}
                       </p>
                   </div>
               </div>
               Rapport généré le ${new Date().toLocaleDateString(
                 "fr-FR"
               )} à ${new Date().toLocaleTimeString("fr-FR")}
           </div>
       </body>
       </html>
     `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="rapport-journalier-${
          targetDate.toISOString().split("T")[0]
        }.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating daily transactions PDF:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du rapport PDF" },
      { status: 500 }
    );
  }
}

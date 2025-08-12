"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);

  const quotationData = {
    company: {
      name: "Soltrack (PTY) LTD",
      regNo: "2018/095975/07",
      vatNo: "4580161802",
    },
    customer: {
      name: "KERIZZMA STEEL PTY LTD",
      regNo: "1997/021017/07",
      address: ["PO BOX 53297", "TROYVILLE", "2136", "South Africa"],
    },
    quotation: {
      number: "QUO112247",
      date: "28/06/2025",
      account: "1134",
      vatPercent: "15%",
      customerVatNumber: "4290137910",
    },
    items: [
      {
        code: "LM086HGP",
        description: "MONTHLY SERVICE SUBSCRIPTION",
        details: "MONTHLY SERVICE SUBSCRIPTION",
        comments:
          "THERE IS NO FD RENTAL ON THIS UNIT, AS CLIENT PAYS CASH - REG UPDATE FROM KERIZZMA STEEL",
        units: 1,
        unitPrice: 695.52,
        vat: 104.33,
        vatPercent: 15.0,
        total: 799.85,
      },
      {
        code: "LG991HGP",
        description: "MONTHLY SERVICE SUBSCRIPTION",
        details: "MONTHLY SERVICE SUBSCRIPTION",
        comments: "",
        units: 1,
        unitPrice: 695.52,
        vat: 104.33,
        vatPercent: 15.0,
        total: 799.85,
      },
      {
        code: "ZSM159GP",
        description: "MONTHLY SERVICE SUBSCRIPTION",
        details: "MONTHLY SERVICE SUBSCRIPTION",
        comments: "",
        units: 1,
        unitPrice: 695.52,
        vat: 104.33,
        vatPercent: 15.0,
        total: 799.85,
      },
      {
        code: "CZ661MGP",
        description: "MONTHLY SERVICE SUBSCRIPTION",
        details: "MONTHLY SERVICE SUBSCRIPTION",
        comments: "",
        units: 1,
        unitPrice: 695.52,
        vat: 104.33,
        vatPercent: 15.0,
        total: 799.85,
      },
      {
        code: "KP321HGP",
        description: "FD RENTALS",
        details: "FD RENTALS",
        comments: "FD RENTALS",
        units: 1,
        unitPrice: 1016.0,
        vat: 152.4,
        vatPercent: 15.0,
        total: 1168.4,
      },
    ],
    totals: {
      subtotal: 23126.88,
      discount: 0.0,
      vat: 3469.03,
      totalInclVat: 26595.91,
    },
  };

  return (
    <div className="flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 min-h-screen">
      <div className="w-full max-w-md">
        <Card className="bg-white/80 shadow-2xl backdrop-blur-sm border-0">
          <CardContent className="p-8 text-center">

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 hover:from-blue-700 to-indigo-600 hover:to-indigo-700 shadow-lg px-6 py-3 rounded-lg w-full font-semibold text-white hover:scale-105 transition-all duration-200 transform"
                >
                   View Quotation
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-bold text-gray-800 text-2xl text-center">
                    QUOTATION
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 p-4">
                  {/* Company Header */}
                  <div className="flex justify-between items-start pb-4 border-b">
                    <div>
                      <h2 className="font-bold text-blue-600 text-xl">
                        {quotationData.company.name}
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Reg No: {quotationData.company.regNo}
                      </p>
                      <p className="text-gray-600 text-sm">
                        VAT No.: {quotationData.company.vatNo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        QUOTATION NO: {quotationData.quotation.number}
                      </p>
                      <p className="text-gray-600 text-sm">
                        Date: {quotationData.quotation.date}
                      </p>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 font-semibold text-gray-800">
                        Bill To:
                      </h3>
                      <div className="text-gray-600 text-sm">
                        <p className="font-medium">
                          {quotationData.customer.name}
                        </p>
                        <p>{quotationData.customer.regNo}</p>
                        {quotationData.customer.address.map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="gap-2 grid grid-cols-2 text-sm">
                          <div>
                            <p className="font-medium">Account:</p>
                            <p>{quotationData.quotation.account}</p>
                          </div>
                          <div>
                            <p className="font-medium">VAT %:</p>
                            <p>VAT {quotationData.quotation.vatPercent}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="font-medium">Customer VAT Number:</p>
                            <p>{quotationData.quotation.customerVatNumber}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="border border-gray-300 w-full border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-left">
                            Item Code
                          </th>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-left">
                            Description
                          </th>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-left">
                            Comments
                          </th>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-center">
                            Units
                          </th>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-right">
                            Unit Price
                          </th>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-right">
                            VAT
                          </th>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-right">
                            VAT%
                          </th>
                          <th className="p-2 border border-gray-300 font-medium text-xs text-right">
                            Total Incl
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotationData.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="p-2 border border-gray-300 text-xs">
                              {String(item.code || '')}
                            </td>
                            <td className="p-2 border border-gray-300 text-xs">
                              {String(item.description || '')}
                            </td>
                            <td className="p-2 border border-gray-300 text-xs">
                              {item.comments}
                            </td>
                            <td className="p-2 border border-gray-300 text-xs text-center">
                              {item.units}
                            </td>
                            <td className="p-2 border border-gray-300 text-xs text-right">
                              {item.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-2 border border-gray-300 text-xs text-right">
                              {item.vat.toFixed(2)}
                            </td>
                            <td className="p-2 border border-gray-300 text-xs text-right">
                              {item.vatPercent.toFixed(2)}%
                            </td>
                            <td className="p-2 border border-gray-300 font-medium text-xs text-right">
                              {item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes */}
                  <div className="text-gray-600 text-sm">
                    <p>
                      <strong>Notes:</strong> FOR JULY 2025 MONTHLY BILLING RUN.
                    </p>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full max-w-md">
                      <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Ex. VAT</span>
                          <span className="font-bold">
                            R {quotationData.totals.subtotal.toFixed(2)}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span>Discount</span>
                          <span>
                            R {quotationData.totals.discount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>VAT</span>
                          <span>R {quotationData.totals.vat.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center font-bold text-blue-600 text-lg">
                          <span>Total Incl. VAT</span>
                          <span>
                            R {quotationData.totals.totalInclVat.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-3 pt-4 border-t text-gray-600 text-xs">
                    <div>
                      <h4 className="font-medium text-gray-800">
                        Head Office:
                      </h4>
                      <p>8 Viscount Road</p>
                      <p>Viscount office park, Block C unit 4 & 5</p>
                      <p>Bedfordview, 2008</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">
                        Postal Address:
                      </h4>
                      <p>P.O Box 95603</p>
                      <p>Grant Park 2051</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">
                        Contact Details:
                      </h4>
                      <p>Phone: 011 824 0066</p>
                      <p>Email: sales@soltrack.co.za</p>
                      <p>Website: www.soltrack.co.za</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

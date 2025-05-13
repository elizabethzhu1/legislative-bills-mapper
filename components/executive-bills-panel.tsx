"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

interface Bill {
  Url?: string
  "Bill ID"?: string
  Name?: string
  "AI Summary"?: string
  "Last Action"?: string
  "Action Date"?: string
  "Bill Progress"?: string
  State?: string
  isExecutive?: boolean
  [key: string]: any // Allow for flexible schema
}

interface ExecutiveBillsPanelProps {
  executiveBills: Bill[]
  selectedBill: Bill | null
  onSelectBill: (bill: Bill | null) => void
}

const ExecutiveBillsPanel: React.FC<ExecutiveBillsPanelProps> = ({ executiveBills, selectedBill, onSelectBill }) => {
  const [searchTerm, setSearchTerm] = useState("")

  // Filter bills based on search term
  const filteredBills = executiveBills.filter((bill) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      bill["Bill ID"]?.toLowerCase().includes(searchLower) ||
      false ||
      bill.Name?.toLowerCase().includes(searchLower) ||
      false ||
      bill["AI Summary"]?.toLowerCase().includes(searchLower) ||
      false
    )
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Badge className="mr-2 bg-purple-500">{executiveBills.length}</Badge>
          Executive Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search executive orders..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredBills.length > 0 ? (
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="space-y-2">
                {filteredBills.map((bill, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-md cursor-pointer transition-colors ${
                      selectedBill && selectedBill["Bill ID"] === bill["Bill ID"]
                        ? "bg-purple-100 border-purple-300 border"
                        : "hover:bg-gray-100 border border-transparent"
                    }`}
                    onClick={() =>
                      selectedBill && selectedBill["Bill ID"] === bill["Bill ID"]
                        ? onSelectBill(null)
                        : onSelectBill(bill)
                    }
                  >
                    <div className="flex justify-between">
                      <div className="font-medium">{bill["Bill ID"] || "No ID"}</div>
                      {bill.State && <Badge variant="outline">{bill.State}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {bill.Name || bill.Title || "No Title"}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[200px] flex items-center justify-center border rounded-md p-4 text-center text-muted-foreground">
              {searchTerm
                ? "No executive orders match your search"
                : executiveBills.length === 0
                  ? "No executive orders available"
                  : "No executive orders to display"}
            </div>
          )}

          {selectedBill && (
            <div className="mt-2 p-3 bg-purple-50 rounded-md border border-purple-200">
              <div className="font-medium">{selectedBill["Bill ID"]}</div>
              <div className="text-sm mt-1">{selectedBill.Name}</div>
              <div className="text-xs text-muted-foreground mt-2 line-clamp-3">
                {selectedBill["AI Summary"] || "No summary available"}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ExecutiveBillsPanel

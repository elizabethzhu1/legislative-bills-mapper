"use client"

import { useBillData } from "./bill-data-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ExternalLink, Calendar } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function ExecutiveOrderSelector() {
  const { executiveOrders, selectedExecutiveOrder, setSelectedExecutiveOrder, loading } = useBillData()

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Select
        value={selectedExecutiveOrder?.id || ""}
        onValueChange={(value) => {
          const selected = executiveOrders.find((eo) => eo.id === value)
          setSelectedExecutiveOrder(selected || null)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an executive order" />
        </SelectTrigger>
        <SelectContent>
          {executiveOrders.map((eo) => (
            <SelectItem key={eo.id} value={eo.id}>
                <div>
                  <span>{eo.title}</span>
                {/* <span className="text-xs text-muted-foreground">
                  {new Date(eo.date).toLocaleDateString()}
                </span> */}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedExecutiveOrder ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedExecutiveOrder.title}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(selectedExecutiveOrder.date).toLocaleDateString()}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">{selectedExecutiveOrder.ai_summary}</p>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={selectedExecutiveOrder.federal_register_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Federal Register
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Executive Order Selected</CardTitle>
            <CardDescription>Select an executive order to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Choose an executive order from the dropdown above to view related bills across states.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

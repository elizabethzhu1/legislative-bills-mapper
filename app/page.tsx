"use client"

import { BillDataProvider } from "@/components/bill-data-provider"
import { ExecutiveOrderSelector } from "@/components/executive-order-selector"
import { StateModal } from "@/components/state-modal"
import USAMap from "@/components/usa-map"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <BillDataProvider>
      <main className="container mx-auto py-5 px-40 max-w-full">
        <h1 className="text-4xl font-bold mb-10 text-center mt-10">US Legislative Bills Explorer</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <h2 className="text-xl font-semibold mb-4">Executive Orders</h2>
            <ExecutiveOrderSelector />
          </div>

          <div className="lg:col-span-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">US Legislative Bills Map</CardTitle>
                  <CardDescription>Click on a state to view its legislative bills</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <USAMap />
              </CardContent>
            </Card>
          </div>
        </div>

        <StateModal />
      </main>
    </BillDataProvider>
  )
}

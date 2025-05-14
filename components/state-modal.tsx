"use client"

import { useBillData } from "./bill-data-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function StateModal() {
  const { selectedState, setSelectedState, filteredBillsByState, selectedExecutiveOrder, fetchSponsorsForBill, statePartyData } = useBillData()
  const [expandedBill, setExpandedBill] = useState<string | null>(null)
  const [loadingSponsors, setLoadingSponsors] = useState<Record<string, boolean>>({})
  const [billSponsors, setBillSponsors] = useState<Record<string, any[]>>({})

  const bills = selectedState ? filteredBillsByState[selectedState] || [] : []
  const stateName = selectedState ? getStateName(selectedState) : ""

  // Calculate average days since last action
  const calculateAverageDaysSinceLastAction = () => {
    const billsWithDates = bills.filter(bill => bill.actionDate || bill["Action Date"])
    if (billsWithDates.length === 0) return null

    const totalDays = billsWithDates.reduce((sum, bill) => {
      const actionDate = new Date(bill.actionDate || bill["Action Date"])
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - actionDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return sum + diffDays
    }, 0)

    return Math.round(totalDays / billsWithDates.length)
  }

  const averageDays = calculateAverageDaysSinceLastAction()

  const handleClose = () => {
    setSelectedState(null)
    setExpandedBill(null)
    setBillSponsors({})
  }

  const handleFetchSponsors = async (billId: string) => {
    if (billSponsors[billId]) return // Don't fetch if we already have the data
    
    setLoadingSponsors(prev => ({ ...prev, [billId]: true }))
    try {
      const sponsors = await fetchSponsorsForBill(billId)
      setBillSponsors(prev => ({ ...prev, [billId]: sponsors }))
    } catch (error) {
      console.error('Failed to fetch sponsors:', error)
    } finally {
      setLoadingSponsors(prev => ({ ...prev, [billId]: false }))
    }
  }

  const toggleBillExpansion = (billNumber: string) => {
    if (expandedBill === billNumber) {
      setExpandedBill(null)
    } else {
      setExpandedBill(billNumber)
    }
  }

  // Format date function
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (e) {
      return dateString
    }
  }

  // Get status color function
  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-400"

    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes("enacted") || lowerStatus.includes("signed") || lowerStatus.includes("adopted") || lowerStatus.includes("passed")) {
      return "bg-green-500"
    } else if (lowerStatus.includes("vetoed") || lowerStatus.includes("failed") || lowerStatus.includes("blocked") || lowerStatus.includes("rejected")) {
      return "bg-red-500"
    } else if (lowerStatus.includes("committee") || lowerStatus.includes("pending") || lowerStatus.includes("introduced") || lowerStatus.includes("in progress")) {
      return "bg-yellow-500"
    } else {
      return "bg-gray-400"
    }
  }

  // Add this helper function at the top level
  function getPositionColor(position: string) {
    switch (position?.toLowerCase()) {
      case 'support':
        return 'bg-green-100 text-green-800'
      case 'oppose':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Inside the StateModal component, add this before the return statement
  const billCounts = bills.reduce((acc, bill) => {
    const position = bill.position?.toLowerCase() || 'n/a'
    acc[position] = (acc[position] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Dialog open={!!selectedState} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {stateName} Legislative Bills
            <Badge className="ml-2" variant="outline">
              {bills.length} bills
            </Badge>
            {selectedState && (
              <Badge 
                className={`ml-2 ${
                  statePartyData[selectedState] === 'Democrat' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {statePartyData[selectedState]} Controlled
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedExecutiveOrder
              ? `Bills related to "${selectedExecutiveOrder.title}"`
              : "All legislative bills for this state"}
            {averageDays !== null && (
              <div className="mt-2 text-sm">
                Average days since last action: <span className="font-medium">{averageDays} days</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-white rounded-lg p-4 shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Supporting Bills</h3>
            <div className="text-2xl font-bold text-green-600">{billCounts['support'] || 0}</div>
          </div>
          <div className="flex-1 bg-white rounded-lg p-4 shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Opposing Bills</h3>
            <div className="text-2xl font-bold text-red-600">{billCounts['oppose'] || 0}</div>
          </div>
          <div className="flex-1 bg-white rounded-lg p-4 shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Neutral/Unknown</h3>
            <div className="text-2xl font-bold text-gray-600">{billCounts['n/a'] || 0}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {bills.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No bills found for this state.</p>
              ) : (
                bills.map((bill, index) => (
                  <Card
                    key={index}
                    className={`
                      transition-all duration-200 cursor-pointer
                      ${expandedBill === bill.billNumber ? "ring-2 ring-blue-500" : "hover:bg-gray-50 dark:hover:bg-gray-800"}
                    `}
                    onClick={() => toggleBillExpansion(bill.billNumber)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{bill.billNumber || bill["Bill ID"] || "No ID"}</CardTitle>
                        {(bill.status || bill["Bill Progress"]) && (
                          <Badge className={getStatusColor(bill.status || bill["Bill Progress"])}>
                            {bill.status || bill["Bill Progress"]}
                          </Badge>
                        )}
                        {bill.position && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionColor(bill.position)}`}>
                            {bill.position}
                          </span>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {bill.name || bill.Name || bill.Title || "No Title"}
                      </CardDescription>
                    </CardHeader>

                    {expandedBill === bill.billNumber ? (
                      <>
                        <CardContent className="pb-2">
                          <div className="space-y-4">
                            {(bill.aiSummary || bill["AI Summary"] || bill.summary || bill.Summary) && (
                              <div>
                                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Summary</h3>
                                <p className="text-sm">
                                  {bill.aiSummary || bill["AI Summary"] || bill.summary || bill.Summary}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-14 text-sm">
                              {(bill.lastAction || bill["Last Action"]) && (
                                <div>
                                  <h3 className="font-semibold text-muted-foreground mb-1">Last Action</h3>
                                  <div>{bill.lastAction || bill["Last Action"]}</div>
                                </div>
                              )}
                              {(bill.actionDate || bill["Action Date"]) && (
                                <div>
                                  <h3 className="font-semibold text-muted-foreground mb-1">Action Date</h3>
                                  <div>{formatDate(bill.actionDate || bill["Action Date"])}</div>
                                </div>
                              )}
                              {(bill.actionDate || bill["Action Date"]) && (
                                <div>
                                  <h3 className="font-semibold text-muted-foreground mb-1">Creation Date</h3>
                                  <div>{formatDate(bill.creationDate || bill["Creation Date"])}</div>
                                </div>
                              )}
                            </div>

                            {bill.sponsors && (
                              <div className="mt-2">
                                <h4 className="text-sm font-medium text-gray-500">Sponsors</h4>
                                <div className="text-sm text-gray-900">
                                  {Array.isArray(bill.sponsors) 
                                    ? bill.sponsors.map((sponsor, index) => (
                                        <div key={index}>
                                          {typeof sponsor === 'string' ? sponsor : sponsor.name}
                                        </div>
                                      ))
                                    : String(bill.sponsors)}
                                </div>
                              </div>
                            )}

                            {/* {bill.sponsors && bill.sponsors.length > 0 && (
                              <div className="mt-2">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Sponsors</h4>
                                <div className="space-y-2">
                                  {bill.sponsors.map((sponsor, index) => (
                                    <div key={index} className="bg-gray-50 p-2 rounded-md">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{sponsor.name}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          sponsor.legislatorParty === 'Democrat' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : sponsor.legislatorParty === 'Republican'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {sponsor.legislatorParty}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        <div>Role: {sponsor.role}</div>
                                        <div>District: {sponsor.district}</div>
                                        {sponsor.primary && (
                                          <span className="text-green-600 font-medium">Primary Sponsor</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )} */}

                            {bill.keywords && (
                              <div className="mt-2">
                                <h4 className="text-sm font-medium text-gray-500">Keywords</h4>
                                <p className="text-sm text-gray-900">{bill.keywords}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0 flex gap-2">
                          {bill.url || bill.Url ? (
                            <Button asChild variant="outline" size="sm" className="mt-2">
                              <a
                                href={bill.url || bill.Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={16} />
                                View Bill Details
                              </a>
                            </Button>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No URL available</p>
                          )}
                          {/* <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFetchSponsors(bill.billNumber)
                            }}
                            disabled={loadingSponsors[bill.billNumber]}
                          >
                            <Users size={16} className="mr-2" />
                            {loadingSponsors[bill.billNumber] ? 'Loading...' : 'View Sponsors'}
                          </Button> */}
                        </CardFooter>
                        {/* {billSponsors[bill.billNumber] && (
                          <CardContent className="pt-0">
                            <div className="mt-4 border-t pt-4">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Sponsors</h4>
                              <div className="space-y-2">
                                {billSponsors[bill.billNumber].map((sponsor, index) => (
                                  <div key={index} className="bg-gray-50 p-2 rounded-md">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{sponsor.name}</span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        sponsor.legislatorParty === 'Democrat' 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : sponsor.legislatorParty === 'Republican'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {sponsor.legislatorParty}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      <div>Role: {sponsor.role}</div>
                                      <div>District: {sponsor.district}</div>
                                      {sponsor.primary && (
                                        <span className="text-green-600 font-medium">Primary Sponsor</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        )} */}
                      </>
                    ) : (
                      <CardContent className="pb-2">
                        {bill.aiSummary || bill["AI Summary"] || bill.summary || bill.Summary ? (
                          <span className="text-sm line-clamp-2 block">
                            {bill.aiSummary || bill["AI Summary"] || bill.summary || bill.Summary}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic block">No summary available</span>
                        )}

                        {(bill.lastAction || bill["Last Action"]) && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {bill.lastAction || bill["Last Action"]}
                              {(bill.actionDate || bill["Action Date"]) &&
                                ` (${formatDate(bill.actionDate || bill["Action Date"])})`}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to get state name from state code
function getStateName(stateCode: string): string {
  const stateNames: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
    US: "Federal",
  }

  return stateNames[stateCode] || stateCode
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useBillData } from "./bill-data-provider"
import { ComposableMap, Geographies, Geography, GeographyFeature, ZoomableGroup } from "react-simple-maps"
import { scaleLinear } from "d3-scale"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bill } from "./bill-data-provider"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Calendar, Users, ZoomIn, ZoomOut, RotateCcw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

// US TopoJSON data
const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

// Map of state names to their two-letter codes
const stateNameToCode: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
}

type ViewType = "bills" | "position" | "party"

function getStateColor(bills: Bill[], viewType: ViewType, statePartyData: Record<string, string>, stateStats: any) {
  if (!bills.length && viewType !== "party") return '#e5e7eb' // gray for no bills

  switch (viewType) {

    case "bills":
      // Color based on number of bills using light blue to navy blue gradient
      const maxBills = 20 // Maximum number of bills for color scaling
      const intensity = Math.min(255, Math.round((bills.length / maxBills) * 255))
      // Start with light blue (173, 216, 230) and transition to navy blue (0, 0, 128)
      const r = Math.round(173 - (173 * intensity / 255))
      const g = Math.round(216 - (216 * intensity / 255))
      const b = Math.round(230 - (102 * intensity / 255))
      return `rgb(${r}, ${g}, ${b})`
    
    case "position": {
      const counts = bills.reduce((acc, bill) => {
        const position = bill.position?.toLowerCase() || 'n/a'
        acc[position] = (acc[position] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const total = bills.length
      const support = counts['support'] || 0
      const oppose = counts['oppose'] || 0
      if (total === 0) return '#e5e7eb'
      const supportRatio = support / total
      const opposeRatio = oppose / total
      // If nearly even (difference ≤ 0.1), use yellow
      if (Math.abs(supportRatio - opposeRatio) <= 0.1) {
        return 'rgb(255, 221, 51)'
      }
      // More support: green, intensity based on support ratio
      if (supportRatio > opposeRatio) {
        const intensity = Math.round(100 + 155 * supportRatio)
        return `rgb(50, ${intensity}, 50)`
      }
      // More oppose: red, intensity based on oppose ratio
      if (opposeRatio > supportRatio) {
        const intensity = Math.round(100 + 155 * opposeRatio)
        return `rgb(${intensity}, 50, 50)`
      }
      return '#e5e7eb'
    }

    case "party":
      const stateCode = bills[0]?.state || Object.keys(statePartyData)[0]
      const party = statePartyData[stateCode]
      return party === "Democrat" ? "rgb(100, 100, 200)" : "rgb(200, 100, 100)"

    default:
      return '#e5e7eb'
  }
}

// Add type declarations for react-simple-maps
declare module 'react-simple-maps' {
  export interface GeographyProps {
    geography: {
      properties: {
        name: string
        postal: string
      }
    }
    fill: string
    stroke: string
    strokeWidth: number
    style: {
      default: {
        outline: string
      }
      hover: {
        outline: string
        fill: string
      }
      pressed: {
        outline: string
        fill: string
      }
    }
    onClick: () => void
  }
}

export default function USAMap() {
  const { filteredBillsByState, loading, error, setSelectedState, statePartyData, selectedState } = useBillData()
  const [tooltipContent, setTooltipContent] = useState("")
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showTooltip, setShowTooltip] = useState(false)
  const [stateStats, setStateStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [viewType, setViewType] = useState<ViewType>("bills")

  // Add state for zoomed state and district data
  const [zoomedState, setZoomedState] = useState<string | null>(null)
  const [districtData, setDistrictData] = useState<any>(null)

  // Add state for zoom level
  const [zoomLevel, setZoomLevel] = useState(1)

  // Add state for expanded bill
  const [expandedBill, setExpandedBill] = useState<string | null>(null)

  // Calculate the maximum number of bills for any state
  const maxBills = Math.max(
    ...Object.values(filteredBillsByState).map((bills) => bills.length),
    1, // Ensure we don't divide by zero
  )

  // Create a color scale based on the number of bills
  const colorScale = scaleLinear<string>()
    .domain([0, Math.max(1, maxBills / 2), maxBills])
    .range(["#BBDEFB", "#2196F3", "#0D47A1"])
    .clamp(true)

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  // Add function to load district data
  const loadDistrictData = async (stateCode: string) => {
    try {
      // Get the state name from the code
      const stateName = getStateName(stateCode)
      if (!stateName) return null

      // Find the most recent congress file for the state
      const response = await fetch(`/data/congressional-district-boundaries-master/${stateName}_112.geojson`)



      if (!response.ok) {
        console.error(`Failed to load district data for ${stateName}`)
        return null
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error loading district data:', error)
      return null
    }
  }

  // Update handleStateClick to include zoom functionality
  const handleStateClick = async (stateCode: string) => {
    if (zoomedState === stateCode) {
      // If already zoomed to this state, zoom out
      setZoomedState(null)
      setDistrictData(null)
    } else {
      // Zoom to the clicked state
      setZoomedState(stateCode)
      const data = await loadDistrictData(stateCode)
      if (data) {
        setDistrictData(data)
      } else {
        // If data loading fails, zoom out
        setZoomedState(null)
      }
    }
  }

  // Add helper functions for bill display
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

  const getPositionColor = (position: string) => {
    switch (position?.toLowerCase()) {
      case 'support':
        return 'bg-green-100 text-green-800'
      case 'oppose':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Helper function to calculate days since last action
  function daysSince(dateString: string | undefined): number | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-md" />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="relative w-full">
      {/* View selector as a dropdown in the top right */}
      <div className="flex justify-end w-full mb-4">
        <Select value={viewType} onValueChange={(value) => setViewType(value as ViewType)}>
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bills">Number of Bills</SelectItem>
            <SelectItem value="position">Support/Oppose</SelectItem>
            <SelectItem value="party">Party Control</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div 
        className="w-full h-[600px]"
        onWheel={(e: React.WheelEvent) => {
          e.preventDefault();
          if (zoomedState) {
            const delta = e.deltaY > 0 ? -0.5 : 0.5;
            setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.5), 8));
          }
        }}
      >
        <ComposableMap 
          projection="geoAlbersUsa" 
          className="w-full h-full"
          projectionConfig={{
            scale: zoomedState ? 2500 * zoomLevel : 1000,
            center: zoomedState ? getStateCenter(zoomedState) : [-96, 38]
          }}
        >
          <ZoomableGroup
            zoom={zoomedState ? zoomLevel : 1}
            center={zoomedState ? getStateCenter(zoomedState) : [-96, 38]}
            minZoom={0.5}
            maxZoom={8}
            onMoveEnd={({ zoom, coordinates }) => {
              if (zoomedState) {
                setZoomLevel(zoom)
              }
            }}
          >
            {/* Always show all states */}
            <Geographies geography={geoUrl}>
              {({ geographies }: { geographies: GeographyFeature[] }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name
                  const stateCode = stateNameToCode[stateName]
                  const stateBills = filteredBillsByState[stateCode] || []
                  const fillColor = getStateColor(stateBills, viewType, statePartyData, stateStats?.[stateCode])
                  const isZoomedState = stateCode === zoomedState

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isZoomedState ? "transparent" : fillColor}
                      stroke="#fff"
                      strokeWidth={0.5}
                      style={{
                        default: {
                          outline: "none",
                        },
                        hover: {
                          outline: "none",
                          fill: isZoomedState ? "transparent" : "#2563eb",
                        },
                        pressed: {
                          outline: "none",
                          fill: isZoomedState ? "transparent" : "#1d4ed8",
                        },
                      }}
                      onClick={() => handleStateClick(stateCode)}
                      className={isZoomedState ? "cursor-default" : "cursor-pointer"}
                    />
                  )
                })
              }
            </Geographies>

            {/* Show congressional districts for zoomed state */}
            {zoomedState && districtData && (
              <Geographies geography={districtData}>
                {({ geographies }: { geographies: GeographyFeature[] }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#bbb"
                      stroke="#fff"
                      strokeWidth={0.5}
                      style={{
                        default: {
                          outline: "none",
                        },
                        hover: {
                          outline: "none",
                          fill: "#2563eb",
                        },
                        pressed: {
                          outline: "none",
                          fill: "#1d4ed8",
                        },
                      }}
                      onClick={() => {
                        console.log(`Clicked district ${geo.properties.DISTRICT}`)
                      }}
                    />
                  ))
                }
              </Geographies>
            )}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Add zoom controls */}
      {zoomedState && (
        <div className="absolute top-4 left-4 flex gap-2">
          <button
            onClick={() => {
              setZoomedState(null)
              setZoomLevel(1)
            }}
            className="bg-white p-1.5 rounded-md shadow-md hover:bg-gray-100"
            title="Back to Overview"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex gap-2 bg-white p-2 rounded-md shadow-md">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 8))}
              className="p-1.5 hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 0.5))}
              className="p-1.5 hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add bill list section */}
      {zoomedState && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {getStateName(zoomedState)} Related Bills to EO
              <Badge className="ml-2" variant="outline">
                {filteredBillsByState[zoomedState]?.length || 0} bills
              </Badge>
              <Badge 
                className={`ml-2 ${
                  statePartyData[zoomedState] === 'Democrat' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {statePartyData[zoomedState]} Controlled
              </Badge>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Supporting Bills</h3>
              <div className="text-2xl font-bold text-green-600">
                {filteredBillsByState[zoomedState]?.filter(bill => bill.position?.toLowerCase() === 'support').length || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Opposing Bills</h3>
              <div className="text-2xl font-bold text-red-600">
                {filteredBillsByState[zoomedState]?.filter(bill => bill.position?.toLowerCase() === 'oppose').length || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Neutral/Unknown</h3>
              <div className="text-2xl font-bold text-gray-600">
                {filteredBillsByState[zoomedState]?.filter(bill => !bill.position || bill.position.toLowerCase() === 'n/a').length || 0}
              </div>
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {filteredBillsByState[zoomedState]?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No bills found for this state.</p>
              ) : (
                filteredBillsByState[zoomedState]?.map((bill, index) => (
                  <Card
                    key={index}
                    className={`
                      transition-all duration-200 cursor-pointer
                      ${expandedBill === bill.billNumber ? "ring-2 ring-blue-500" : "hover:bg-gray-50"}
                    `}
                    onClick={() => setExpandedBill(expandedBill === bill.billNumber ? null : bill.billNumber)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <CardTitle className="text-lg">{bill.billNumber || bill["Bill ID"] || "No ID"}</CardTitle>
                          {/* Days since last action */}
                          {bill.actionDate || bill["Action Date"] ? (
                            <span className="text-xs text-gray-500 mt-0.5">
                              {daysSince(bill.actionDate || bill["Action Date"]) !== null ? `${daysSince(bill.actionDate || bill["Action Date"])} days since last action` : ""}
                            </span>
                          ) : null}
                        </div>
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

                            {bill.keywords && (
                              <div className="mt-2">
                                <h4 className="text-sm font-medium text-gray-500">Keywords</h4>
                                <p className="text-sm text-gray-900">{bill.keywords}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0">
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
                        </CardFooter>
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
      )}

      {/* Legend: now directly below the map with mt-2 */}
      {viewType === "bills" && (
        <div className="flex justify-center mt-2 space-x-8 w-full">
          <div className="flex flex-row items-center space-x-8 bg-white p-4 rounded-lg shadow-lg">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(173,216,230)' }}></div>
              <span className="text-xs mt-1">1-5</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(100,149,237)' }}></div>
              <span className="text-xs mt-1">6-10</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(65,105,225)' }}></div>
              <span className="text-xs mt-1">11-15</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(0,0,128)' }}></div>
              <span className="text-xs mt-1">16+</span>
            </div>
          </div>
        </div>
      )}
      {viewType === "position" && (
        <div className="flex justify-center mt-2 space-x-8 w-full">
          <div className="flex flex-row items-center space-x-8 bg-white p-4 rounded-lg shadow-lg">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(100,200,100)' }}></div>
              <span className="text-xs mt-1">Supporting</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(200,100,100)' }}></div>
              <span className="text-xs mt-1">Opposing</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <span className="text-xs mt-1">Neutral/Unknown</span>
            </div>
          </div>
        </div>
      )}
      {viewType === "party" && (
        <div className="flex justify-center mt-2 space-x-8 w-full">
          <div className="flex flex-row items-center space-x-8 bg-white p-4 rounded-lg shadow-lg">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(100,100,200)' }}></div>
              <span className="text-xs mt-1">Democrat</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(200,100,100)' }}></div>
              <span className="text-xs mt-1">Republican</span>
            </div>
          </div>
        </div>
      )}

      {/* State statistics modal */}
      {selectedState && (
        <Dialog open={!!selectedState} onOpenChange={() => setSelectedState(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{getStateName(selectedState)} {viewType === "overview" ? "Legislative Statistics" : "Bills"}</DialogTitle>
            </DialogHeader>
            {viewType === "overview" && stateStats?.[selectedState] && (
              <div className="space-y-8">
                {/* Bill Progress Pie Chart */}
                {stateStats[selectedState].bill_progress && (
                  <div>
                    <h3 className="font-semibold mb-2">Bill Progress</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stateStats[selectedState].bill_progress).map(([name, value]) => ({ name, value }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {Object.keys(stateStats[selectedState].bill_progress).map((_, idx) => (
                            <Cell key={idx} fill={["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"][idx % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* Bill Sponsors Pie Chart */}
                {stateStats[selectedState].bill_sponsors && (
                  <div>
                    <h3 className="font-semibold mb-2">Bill Sponsors</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stateStats[selectedState].bill_sponsors).map(([name, value]) => ({ name, value }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {Object.keys(stateStats[selectedState].bill_sponsors).map((_, idx) => (
                            <Cell key={idx} fill={["#1976d2", "#d32f2f", "#ffb300"][idx % 3]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* Bill Types Pie Chart */}
                {stateStats[selectedState].bill_types && (
                  <div>
                    <h3 className="font-semibold mb-2">Bill Types</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stateStats[selectedState].bill_types).map(([name, value]) => ({ name, value }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {Object.keys(stateStats[selectedState].bill_types).map((_, idx) => (
                            <Cell key={idx} fill={["#1976d2", "#d32f2f", "#ffb300"][idx % 3]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Helper function to get state name from code
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

// Add helper function to get state center coordinates
function getStateCenter(stateCode: string): [number, number] {
  const stateCenters: Record<string, [number, number]> = {
    AL: [-86.9023, 32.3182],
    AK: [-152.4044, 66.1605],
    AZ: [-111.0937, 34.0489],
    AR: [-92.1994, 34.9697],
    CA: [-119.4179, 36.7783],
    CO: [-105.7821, 39.5501],
    CT: [-72.7550, 41.6032],
    DE: [-75.5277, 39.3185],
    FL: [-81.6869, 27.6648],
    GA: [-83.4428, 33.0406],
    HI: [-155.5828, 19.8968],
    ID: [-114.4784, 44.0682],
    IL: [-88.9861, 40.3495],
    IN: [-86.1349, 39.8494],
    IA: [-93.0977, 42.0115],
    KS: [-96.7265, 38.5266],
    KY: [-85.3022, 37.6681],
    LA: [-91.9623, 31.1695],
    ME: [-69.3819, 45.2538],
    MD: [-76.6413, 39.0458],
    MA: [-71.3824, 42.4072],
    MI: [-85.6024, 44.3148],
    MN: [-94.6859, 46.7296],
    MS: [-89.6785, 32.3547],
    MO: [-92.2884, 38.4561],
    MT: [-110.3626, 46.8797],
    NE: [-99.9018, 41.4925],
    NV: [-117.2249, 38.8026],
    NH: [-71.5724, 43.1939],
    NJ: [-74.5210, 40.0583],
    NM: [-105.8701, 34.5199],
    NY: [-75.4652, 42.9538],
    NC: [-79.0193, 35.6301],
    ND: [-100.7790, 47.5515],
    OH: [-82.7937, 40.4173],
    OK: [-97.0929, 35.0078],
    OR: [-120.5542, 43.8041],
    PA: [-77.7996, 41.2033],
    RI: [-71.5118, 41.5801],
    SC: [-80.9470, 33.8361],
    SD: [-99.9018, 44.2998],
    TN: [-86.5804, 35.7478],
    TX: [-99.3312, 31.9686],
    UT: [-111.8624, 39.3209],
    VT: [-72.7107, 44.5588],
    VA: [-78.6569, 37.5215],
    WA: [-120.4472, 47.3826],
    WV: [-80.7937, 38.5976],
    WI: [-88.7879, 44.2685],
    WY: [-107.2903, 43.0760],
    DC: [-77.0369, 38.9072]
  }
  return stateCenters[stateCode] || [-96, 38]
}

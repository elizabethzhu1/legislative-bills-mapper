"use client"

import type React from "react"

import { useState } from "react"
import { useBillData } from "./bill-data-provider"
import { ComposableMap, Geographies, Geography, GeographyFeature } from "react-simple-maps"
import { scaleLinear } from "d3-scale"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bill } from "./bill-data-provider"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

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

function getStateColor(bills: Bill[], viewType: ViewType, statePartyData: Record<string, string>) {
  if (!bills.length) return '#e5e7eb' // gray for no bills

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
      const stateCode = bills[0]?.state
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
  const { filteredBillsByState, loading, error, setSelectedState, statePartyData } = useBillData()
  const [viewType, setViewType] = useState<ViewType>("bills")
  const [tooltipContent, setTooltipContent] = useState("")
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showTooltip, setShowTooltip] = useState(false)

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

      <div className="w-full">
        <ComposableMap projection="geoAlbersUsa" className="w-full h-auto">
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: GeographyFeature[] }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name
                const stateCode = stateNameToCode[stateName]
                const stateBills = filteredBillsByState[stateCode] || []
                const fillColor = getStateColor(stateBills, viewType, statePartyData)

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
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
                      if (stateBills.length > 0) {
                        setSelectedState(stateCode)
                      }
                    }}
                    className={stateBills.length > 0 ? "cursor-pointer" : "cursor-default"}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Horizontal legend below the map for number of bills */}
      {viewType === "bills" && (
        <div className="flex justify-center mt-6 space-x-8 w-full">
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

      {/* Horizontal legend for support/oppose view */}
      {viewType === "position" && (
        <div className="flex justify-center mt-6 space-x-8 w-full">
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

      {/* Horizontal legend for party control view */}
      {viewType === "party" && (
        <div className="flex justify-center mt-6 space-x-8 w-full">
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
    </div>
  )
}

"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import Papa from "papaparse"

// Define types for our bill data
export interface Bill {
  state: string
  billNumber: string
  name?: string
  summary?: string
  aiSummary?: string
  url?: string
  status?: string
  lastAction?: string
  actionDate?: string
  type?: "executive" | "legislative"
  source?: string
  keywords?: string
  sponsors?: string
  billProgress?: string
  position?: string
  [key: string]: any // Allow for flexible schema
}

export interface ExecutiveOrder {
  id: string
  title: string
  date: string
  federal_register_link: string
  ai_summary: string
  bill_sheet: string
}

export type ViewMode = "bills" | "party"

interface BillsByState {
  [state: string]: Bill[]
}

interface StatePartyData {
  [state: string]: "Democrat" | "Republican"
}

interface BillDataContextType {
  billsByState: BillsByState
  loading: boolean
  error: string | null
  executiveOrders: ExecutiveOrder[]
  selectedExecutiveOrder: ExecutiveOrder | null
  setSelectedExecutiveOrder: (order: ExecutiveOrder | null) => void
  filteredBillsByState: BillsByState
  selectedState: string | null
  setSelectedState: (state: string | null) => void
  statePartyData: StatePartyData
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

// Create context
const BillDataContext = createContext<BillDataContextType | undefined>(undefined)

// Define props for provider component
interface BillDataProviderProps {
  children: ReactNode
}

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

// Valid state codes
const validStateCodes = new Set(Object.values(stateNameToCode))
validStateCodes.add("US") // Add US for federal bills

// Sample state party data
const SAMPLE_STATE_PARTY_DATA: StatePartyData = {
  AL: "Republican",
  AK: "Republican",
  AZ: "Republican",
  AR: "Republican",
  CA: "Democrat",
  CO: "Democrat",
  CT: "Democrat",
  DE: "Democrat",
  FL: "Republican",
  GA: "Republican",
  HI: "Democrat",
  ID: "Republican",
  IL: "Democrat",
  IN: "Republican",
  IA: "Republican",
  KS: "Republican",
  KY: "Republican",
  LA: "Republican",
  ME: "Democrat",
  MD: "Democrat",
  MA: "Democrat",
  MI: "Democrat",
  MN: "Democrat",
  MS: "Republican",
  MO: "Republican",
  MT: "Republican",
  NE: "Republican",
  NV: "Democrat",
  NH: "Republican",
  NJ: "Democrat",
  NM: "Democrat",
  NY: "Democrat",
  NC: "Republican",
  ND: "Republican",
  OH: "Republican",
  OK: "Republican",
  OR: "Democrat",
  PA: "Democrat",
  RI: "Democrat",
  SC: "Republican",
  SD: "Republican",
  TN: "Republican",
  TX: "Republican",
  UT: "Republican",
  VT: "Democrat",
  VA: "Republican",
  WA: "Democrat",
  WV: "Republican",
  WI: "Democrat",
  WY: "Republican",
}

export const BillDataProvider = ({ children }: BillDataProviderProps) => {
  const [billsByState, setBillsByState] = useState<BillsByState>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executiveOrders, setExecutiveOrders] = useState<ExecutiveOrder[]>([])
  const [selectedExecutiveOrder, setSelectedExecutiveOrder] = useState<ExecutiveOrder | null>(null)
  const [filteredBillsByState, setFilteredBillsByState] = useState<BillsByState>({})
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [statePartyData, setStatePartyData] = useState<StatePartyData>({})
  const [viewMode, setViewMode] = useState<ViewMode>("bills")

  // Load state party data
  useEffect(() => {
    // Use hardcoded state party data instead of fetching
    setStatePartyData(SAMPLE_STATE_PARTY_DATA)
  }, [])

  // Load executive orders
  useEffect(() => {
    const loadExecutiveOrders = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch the executive orders data from eo-to-billsheet.json
        const response = await fetch('/data/eo-to-billsheet.json')
        if (!response.ok) {
          throw new Error(`Failed to fetch executive orders: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Transform the data into the expected format
        const orders: ExecutiveOrder[] = Object.entries(data).map(([title, details]: [string, any]) => ({
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title,
          date: details.date,
          federal_register_link: details.federal_register_link,
          ai_summary: details.ai_summary,
          bill_sheet: details.bill_sheet
        }))

        // Sort orders by date in descending order (newest first)
        orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setExecutiveOrders(orders)
        console.log("Loaded executive orders:", orders)

        setLoading(false)
      } catch (err) {
        console.error("Error loading executive orders:", err)
        setError(`Failed to load executive orders: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }

    loadExecutiveOrders()
  }, [])

  // Load bills when an executive order is selected
  useEffect(() => {
    if (!selectedExecutiveOrder) {
      setFilteredBillsByState({})
      return
    }

    const loadBillsForExecutiveOrder = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get the billsheet filename from the selected executive order
        const billSheetFilename = selectedExecutiveOrder.bill_sheet

        if (!billSheetFilename) {
          throw new Error("No bill sheet specified for this executive order")
        }

        console.log(`Loading bills from ${billSheetFilename}`)

        // Fetch the CSV file
        const response = await fetch(`/data/${billSheetFilename}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch bill data: ${response.statusText}`)
        }

        const csvText = await response.text()

        // Parse the CSV data
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              console.log("CSV parsing complete:", results.data.length, "rows")

              // Process the CSV data
              const byState: BillsByState = {}

              results.data.forEach((row: any) => {
                // Extract state from the data
                let state = row.State || ""

                // Skip rows without a state
                if (!state) return

                // Normalize state to 2-letter code if needed
                if (state.length > 2) {
                  // Try to convert state name to code
                  const stateCode = stateNameToCode[state]
                  if (stateCode) {
                    state = stateCode
                  }
                }

                // Skip invalid states
                if (!validStateCodes.has(state)) return

                // Initialize the state array if needed
                if (!byState[state]) {
                  byState[state] = []
                }

                // Create a bill object with all available information
                const bill: Bill = {
                  billNumber: row["Bill ID"] || "",
                  name: row.Name || "",
                  summary: row.Summary || "",
                  aiSummary: row["AI Summary"],
                  status: row["Bill Progress"],
                  url: row.Url,
                  state: row.State,
                  lastAction: row["Last Action"],
                  actionDate: row["Action Date"],
                  keywords: row.Keywords,
                  sponsors: row.Sponsors,
                  billProgress: row["Bill Progress"],
                  position: row.Position || "N/A"
                }

                byState[state].push(bill)
              })

              console.log(`Processed bills for ${Object.keys(byState).length} states from ${billSheetFilename}`)
              setFilteredBillsByState(byState)
              setLoading(false)
            } catch (err) {
              console.error("Error processing CSV data:", err)
              setError(`Failed to process bill data: ${err instanceof Error ? err.message : String(err)}`)
              setLoading(false)
            }
          },
          error: (err) => {
            console.error("Error parsing CSV:", err)
            setError(`Failed to parse CSV: ${err.message}`)
            setLoading(false)
          },
        })
      } catch (err) {
        console.error("Error loading bills for executive order:", err)
        setError(`Failed to load bills: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }

    loadBillsForExecutiveOrder()
  }, [selectedExecutiveOrder])

  return (
    <BillDataContext.Provider
      value={{
        billsByState,
        loading,
        error,
        executiveOrders,
        selectedExecutiveOrder,
        setSelectedExecutiveOrder,
        filteredBillsByState,
        selectedState,
        setSelectedState,
        statePartyData,
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </BillDataContext.Provider>
  )
}

// Custom hook to use the bill data context
export const useBillData = () => {
  const context = useContext(BillDataContext)
  if (context === undefined) {
    throw new Error("useBillData must be used within a BillDataProvider")
  }
  return context
}

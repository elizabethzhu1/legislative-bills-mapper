import fs from "fs"
import path from "path"
import Papa from "papaparse"

// Function to extract bill numbers from CSV and create mapping
export function extractBillNumbers() {
  try {
    // Read the CSV file
    const csvFilePath = path.join(process.cwd(), "public", "data", "eo-gender.csv")
    const csvData = fs.readFileSync(csvFilePath, "utf8")

    // Parse the CSV data
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    })

    // Extract bill numbers and states
    const bills = parsedData.data
      .map((row: any) => ({
        billNumber: row["Bill ID"],
        state: row["State"],
        name: row["Name"],
        url: row["Url"],
      }))
      .filter((bill: any) => bill.billNumber && bill.state)

    // Create mapping
    const mapping = {
      "eo-gender": {
        title: "Executive Order on Gender Identity",
        description: "Executive order related to gender identity policies",
        bills: bills,
      },
    }

    // Write to JSON file
    const jsonFilePath = path.join(process.cwd(), "public", "data", "eo-to-bills.json")
    fs.writeFileSync(jsonFilePath, JSON.stringify(mapping, null, 2))

    console.log(`Successfully extracted ${bills.length} bills and created mapping in eo-to-bills.json`)
    return mapping
  } catch (error) {
    console.error("Error extracting bill numbers:", error)
    return null
  }
}

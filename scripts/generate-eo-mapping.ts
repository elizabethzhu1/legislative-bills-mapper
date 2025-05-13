import { extractBillNumbers } from "../utils/extract-bill-numbers"

// Execute the extraction function
async function main() {
  console.log("Starting bill extraction process...")
  const result = await extractBillNumbers()

  if (result) {
    console.log("Bill extraction completed successfully!")
    console.log(`Mapped ${Object.keys(result).length} executive orders`)

    // Log the first few bills for verification
    const firstEO = Object.keys(result)[0]
    if (firstEO) {
      const bills = result[firstEO].bills
      console.log(`First EO "${result[firstEO].title}" has ${bills.length} bills`)
      console.log("Sample bills:", bills.slice(0, 3))
    }
  } else {
    console.error("Bill extraction failed")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Error in generate-eo-mapping script:", err)
  process.exit(1)
})

import { NextResponse } from "next/server"
import { extractBillNumbers } from "@/utils/extract-bill-numbers"

export async function GET() {
  try {
    const result = await extractBillNumbers()

    if (!result) {
      return NextResponse.json({ error: "Failed to extract bill numbers" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Successfully extracted bill numbers and created mapping",
      data: result,
    })
  } catch (error) {
    console.error("Error in extract-bills API route:", error)
    return NextResponse.json({ error: "An error occurred while extracting bill numbers" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { extractBillNumbers } from "@/utils/extract-bill-numbers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const legislatorID = searchParams.get("legislatorID")

  if (!legislatorID) {
    return NextResponse.json({ error: "Missing legislatorID parameter" }, { status: 400 })
  }

  try {
    const apiUrl = `https://www.billtrack50.com/BT50Api/2.1/json/legislators/${legislatorID}/bills`
    const apiKey = process.env.BILLTRACK50_API_KEY

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `apikey ${apiKey}`
      }
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch bills" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

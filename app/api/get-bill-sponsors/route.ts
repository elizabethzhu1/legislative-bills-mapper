import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const billID = searchParams.get("billID")

  if (!billID) {
    return NextResponse.json({ error: "Missing billID parameter" }, { status: 400 })
  }

  const apiUrl = `https://www.billtrack50.com/BT50Api/2.1/bills/${billID}/sponsors`
  const apiKey = process.env.BILLTRACK50_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `apikey ${apiKey}`,
      Accept: 'application/json'
    }
  })

  if (!res.ok) {
    const errorText = await res.text()
    return NextResponse.json({ 
      error: res.statusText,
      details: errorText
    }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}

// curl -v GET "https://www.billtrack50.com/BT50Api/2.1/bills/HB1585/sponsors" -H "Authorization: apikey 34d80381-9a2e-488f-98a8-4ec3b90dc09d"
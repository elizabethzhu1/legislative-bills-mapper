"use client"

import { useBillData } from "./bill-data-provider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useBillData()

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="view-mode" className={viewMode === "bills" ? "font-medium" : "text-muted-foreground"}>
        Bill Count
      </Label>
      <Switch
        id="view-mode"
        checked={viewMode === "party"}
        onCheckedChange={(checked) => setViewMode(checked ? "party" : "bills")}
      />
      <Label htmlFor="view-mode" className={viewMode === "party" ? "font-medium" : "text-muted-foreground"}>
        Party View
      </Label>
    </div>
  )
}

"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Building } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const BUILDINGS = [
  "Admin Building",
  "Conference Center",
  "Garage",
  "Site",
]

interface BuildingComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SchoolCombobox({ value, onChange, placeholder = "Select or type building name" }: BuildingComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputFocused, setInputFocused] = React.useState(false)

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    if (!open) {
      setOpen(true)
    }
  }

  const handleInputFocus = () => {
    setInputFocused(true)
    setOpen(true)
  }

  const handleInputBlur = () => {
    setInputFocused(false)
    // Delay closing to allow for item selection
    setTimeout(() => {
      if (!inputFocused) {
        setOpen(false)
      }
    }, 200)
  }

  const filteredSchools = BUILDINGS.filter((school) => school.toLowerCase().includes(value.toLowerCase()))

  return (
    <div className="relative">
      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="pl-10 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setOpen(!open)}
          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
          type="button"
        >
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      {open && (
        <div className="absolute z-[999] w-full bottom-full mb-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredSchools.length > 0 ? (
            <div className="py-1">
              {filteredSchools.map((school) => (
                <button
                  key={school}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center"
                  onClick={() => handleSelect(school)}
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                >
                  <Check className={cn("mr-2 h-4 w-4", value === school ? "opacity-100" : "opacity-0")} />
                  {school}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm">
              {value ? `No buildings found. Press Enter to use "${value}"` : "No buildings found."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

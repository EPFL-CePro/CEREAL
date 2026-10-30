"use client"
import { type Dispatch, type SetStateAction } from "react"

import dynamic from "next/dynamic"

import chroma from "chroma-js"
import { type User } from "next-auth"
import { type StylesConfig } from "react-select"

const Select = dynamic(() => import("react-select"), { ssr: false })

interface AppUser extends User {
  isAdmin?: boolean
}

interface StatusOption {
  value: string
  label: string
  color: string
  needsAdmin: boolean
  fcColor: string
  hexColor: string
}

interface FiltersProps {
  examStatus?: StatusOption[]
  user: AppUser
  setFilters: Dispatch<SetStateAction<unknown>>
}

const colourStyles: StylesConfig<StatusOption, true> = {
  control: (styles) => ({
    ...styles,
    backgroundColor: "white",
    ":focus-within": { borderColor: "red", boxShadow: "0 0 0 1px red" },
  }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.hexColor)
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        : isSelected
          ? data.hexColor
          : isFocused
            ? color.alpha(0.1).css()
            : undefined,
      color: isDisabled
        ? "#ccc"
        : isSelected
          ? chroma.contrast(color, "white") > 2
            ? "white"
            : "black"
          : data.hexColor,
      cursor: isDisabled ? "not-allowed" : "default",

      ":active": {
        ...styles[":active"],
        backgroundColor: !isDisabled
          ? isSelected
            ? data.hexColor
            : color.alpha(0.3).css()
          : undefined,
      },
    }
  },
  multiValue: (styles, { data }) => {
    const color = chroma(data.hexColor)
    return {
      ...styles,
      backgroundColor: color.alpha(0.1).css(),
    }
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    color: chroma(data.hexColor).darken(1).css(),
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
    color: data.hexColor,
    ":hover": {
      backgroundColor: data.hexColor,
      color: "white",
      cursor: "pointer",
    },
  }),
}

export function Filters({ examStatus, setFilters }: FiltersProps) {
  return (
    <Select
      isMulti
      name="colors"
      options={examStatus}
      className="basic-multi-select z-10"
      classNamePrefix="select"
      placeholder="Filters..."
      theme={(theme) => ({
        ...theme,
        borderRadius: 9,
      })}
      onChange={(filters: unknown) => setFilters(filters)}
      styles={colourStyles as StylesConfig}
    />
  )
}

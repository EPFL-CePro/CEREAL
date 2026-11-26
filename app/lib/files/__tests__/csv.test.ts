import { describe, expect, it } from "vitest"

import { toCsv } from "../csv"

const BOM = "﻿"

describe("toCsv", () => {
  it("joins the fields with commas and the rows with CRLF, after a BOM", () => {
    expect(toCsv([["A", "B"], [1, "x"]])).toBe(`${BOM}A,B\r\n1,x\r\n`)
  })

  it("keeps empty fields", () => {
    expect(toCsv([["", "a", ""]])).toBe(`${BOM},a,\r\n`)
  })

  it("quotes the fields containing a comma, a quote or a line break", () => {
    expect(toCsv([['Jo "J"', "Doe, Jr", "a\nb"]])).toBe(
      `${BOM}"Jo ""J""","Doe, Jr","a\nb"\r\n`,
    )
  })
})

import React from "react"

import { components, type OptionProps, type GroupBase } from "react-select"

const CustomOption = (
  props: OptionProps<unknown, boolean, GroupBase<unknown>>,
) => {
  const { children, innerProps, ...rest } = props
  // remove React Select's mouse handlers that can interfere with custom behavior
  const { ...innerRest } = innerProps || {}
  const newProps = {
    ...rest,
    innerProps: innerRest as typeof innerProps,
  } as OptionProps<unknown, boolean, GroupBase<unknown>>

  return <components.Option {...newProps}>{children}</components.Option>
}

export default CustomOption

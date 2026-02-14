import * as React from "react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, ...props }, ref) => {
    // Ensure onChange is always present if value is provided
    const selectProps = { ...props }
    if (selectProps.value !== undefined && !selectProps.onChange) {
      selectProps.onChange = () => {} // No-op to prevent React warning
    }
    return (
      <select
        ref={ref}
        className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...selectProps}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

// Simple wrapper components that just pass through to native select
const SelectTrigger = React.forwardRef<HTMLSelectElement, SelectProps>(
  (props, ref) => {
    // Ensure onChange is always present to avoid React warnings
    if (!props.onChange) {
      return <Select ref={ref} {...props} onChange={() => {}} />
    }
    return <Select ref={ref} {...props} />
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, value, ...props }: { placeholder?: string; value?: string; [key: string]: any }) => {
  // This is just for compatibility - the actual value comes from the select
  return null
}

const SelectContent = ({ children }: { children: React.ReactNode }) => {
  // In native select, children are options, so just return them
  return <>{children}</>
}

const SelectItem = ({ value, children, ...props }: { value: string; children: React.ReactNode; [key: string]: any }) => (
  <option value={value} {...props}>
    {children}
  </option>
)

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }

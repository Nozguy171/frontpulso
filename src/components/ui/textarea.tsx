import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, autoComplete, name, wrap = "soft", ...props }: React.ComponentProps<"textarea">) {
  const id = React.useId()

  return (
    <textarea
      data-slot="textarea"
      autoComplete={autoComplete ?? "new-password"}
      name={name ?? `pulso-no-autofill-${id}`}
      wrap={wrap}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex min-h-16 w-full min-w-0 max-w-full resize-y overflow-x-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

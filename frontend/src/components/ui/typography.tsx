import * as React from "react"

import { cn } from "@/lib/utils"

const H1 = ({ className, ...props }: React.ComponentProps<"h1">) => (
  <h1
    data-slot="typography-h1"
    className={cn(
      "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      className
    )}
    {...props}
  />
)

const H2 = ({ className, ...props }: React.ComponentProps<"h2">) => (
  <h2
    data-slot="typography-h2"
    className={cn(
      "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      className
    )}
    {...props}
  />
)

const H3 = ({ className, ...props }: React.ComponentProps<"h3">) => (
  <h3
    data-slot="typography-h3"
    className={cn(
      "scroll-m-20 text-2xl font-semibold tracking-tight",
      className
    )}
    {...props}
  />
)

const H4 = ({ className, ...props }: React.ComponentProps<"h4">) => (
  <h4
    data-slot="typography-h4"
    className={cn(
      "scroll-m-20 text-xl font-semibold tracking-tight",
      className
    )}
    {...props}
  />
)

const P = ({ className, ...props }: React.ComponentProps<"p">) => (
  <p
    data-slot="typography-p"
    className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
    {...props}
  />
)

const Blockquote = ({ className, ...props }: React.ComponentProps<"blockquote">) => (
  <blockquote
    data-slot="typography-blockquote"
    className={cn("mt-6 border-l-2 pl-6 italic", className)}
    {...props}
  />
)

const InlineCode = ({ className, ...props }: React.ComponentProps<"code">) => (
  <code
    data-slot="typography-inline-code"
    className={cn(
      "rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      className
    )}
    {...props}
  />
)

const Lead = ({ className, ...props }: React.ComponentProps<"p">) => (
  <p
    data-slot="typography-lead"
    className={cn("text-xl text-muted-foreground", className)}
    {...props}
  />
)

const Large = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="typography-large"
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
)

const Small = ({ className, ...props }: React.ComponentProps<"small">) => (
  <small
    data-slot="typography-small"
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
)

const Muted = ({ className, ...props }: React.ComponentProps<"p">) => (
  <p
    data-slot="typography-muted"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
)

export { H1, H2, H3, H4, P, Blockquote, InlineCode, Lead, Large, Small, Muted }

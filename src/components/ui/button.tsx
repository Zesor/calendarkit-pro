import * as React from "react"
import { cx } from "../../utils"

// Focus ring and disabled state shared by the toolbar buttons; each caller sets its own look
// (display, size, colors), so no class is ever overridden.
const BUTTON =
  "items-center justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

const Button = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={cx(BUTTON, className)} {...props} />
)

export { Button }

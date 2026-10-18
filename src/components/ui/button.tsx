import * as React from "react"
import { cx } from "../../utils"

// Focus ring and disabled state shared by the toolbar buttons; each caller sets its own look
// (display, size, colors), so no class is ever overridden.
const BUTTON =
  "ck:items-center ck:justify-center ck:whitespace-nowrap ck:ring-offset-background ck:focus-visible:outline-hidden ck:focus-visible:ring-2 ck:focus-visible:ring-ring ck:focus-visible:ring-offset-2 ck:disabled:pointer-events-none ck:disabled:opacity-50"

const Button = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={cx(BUTTON, className)} {...props} />
)

export { Button }

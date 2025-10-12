import * as React from "react"
import { cn } from "@/lib/utils"
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
export function Button({ className, ...props }: ButtonProps) {
  return <button className={cn("inline-flex items-center justify-center rounded-md px-4 py-2 bg-white/10 hover:bg-white/20", className)} {...props} />
}

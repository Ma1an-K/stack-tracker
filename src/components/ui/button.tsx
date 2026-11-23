import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold select-none transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 ease-out-expo active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Gold gradient for the one primary action on a screen
        default: "gold-fill text-primary-foreground hover:brightness-105",
        // Raised onyx for most actions
        secondary: "bg-secondary text-secondary-foreground border border-border/70 hover:bg-accent",
        // Brass outline for tertiary actions
        outline: "border border-border bg-transparent text-foreground hover:bg-accent hover:border-gold/30",
        // Ghost for minimal actions
        ghost: "text-foreground hover:bg-accent",
        destructive: "bg-destructive/10 text-destructive border border-destructive/35 hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-10 rounded-lg px-3.5 text-[0.8125rem]",
        lg: "h-12 px-7 text-[0.9375rem]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

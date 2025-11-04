import * as React from "react";
import { m } from "framer-motion";

import { cn } from "@/lib/utils";
import { fadeScale, cardHover, tapScale, getTransition } from "@/lib/motionPresets";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Индекс для staggered анимации */
  index?: number;
  /** Отключить анимацию появления */
  disableAnimation?: boolean;
  /** Включить layout-анимацию */
  layout?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, index = 0, disableAnimation = false, layout = false, ...props }, ref) => {
    const shouldReduce = typeof window !== "undefined" && 
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (disableAnimation || shouldReduce) {
      return (
        <div
          ref={ref}
          className={cn(
            "shadcn-card rounded-xl border bg-card border-card-border text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-lg",
            className,
          )}
          {...props}
        />
      );
    }

    const variants = {
      hidden: { ...fadeScale.hidden },
      show: {
        ...fadeScale.show,
      },
    };

    const transitionConfig = {
      ...getTransition(0.25),
      delay: index * 0.05,
    };

    return (
      <m.div
        ref={ref}
        className={cn(
          "shadcn-card rounded-xl border bg-card border-card-border text-card-foreground shadow-sm",
          className,
        )}
        variants={variants}
        initial="hidden"
        animate="show"
        whileHover={cardHover}
        whileTap={tapScale}
        layout={layout}
        transition={transitionConfig}
        {...(props as any)}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};

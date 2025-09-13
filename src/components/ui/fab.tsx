import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const fabVariants = cva(
  "fixed z-[80] inline-flex items-center justify-center rounded-full shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:shadow-xl active:shadow-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-14 w-14 [&_svg]:h-6 [&_svg]:w-6",
        sm: "h-12 w-12 [&_svg]:h-5 [&_svg]:w-5",
        lg: "h-16 w-16 [&_svg]:h-7 [&_svg]:w-7",
        mini: "h-10 w-10 [&_svg]:h-4 [&_svg]:w-4",
      },
      position: {
        "bottom-right": "bottom-4 right-4 md:bottom-6 md:right-6",
        "bottom-left": "bottom-4 left-4 md:bottom-6 md:left-6",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 md:bottom-6",
        "top-right": "top-4 right-4 md:top-6 md:right-6",
        "top-left": "top-4 left-4 md:top-6 md:left-6",
      },
      extended: {
        true: "px-4 gap-2",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      position: "bottom-right",
      extended: false,
    },
  },
);

export interface FABProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fabVariants> {
  label?: string;
  showLabel?: boolean;
  hideOnScroll?: boolean;
  offset?: {
    bottom?: string;
    right?: string;
    left?: string;
    top?: string;
  };
}

const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  (
    {
      className,
      variant,
      size,
      position,
      extended,
      label,
      showLabel = false,
      hideOnScroll = false,
      offset,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);
    const [lastScrollY, setLastScrollY] = React.useState(0);

    React.useEffect(() => {
      if (!hideOnScroll) return;

      const handleScroll = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }

        setLastScrollY(currentScrollY);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, [hideOnScroll, lastScrollY]);

    const shouldExtend = extended || (showLabel && label);

    const customStyle = React.useMemo(() => {
      const offsetStyles: React.CSSProperties = {};

      if (offset?.bottom) offsetStyles.bottom = offset.bottom;
      if (offset?.right) offsetStyles.right = offset.right;
      if (offset?.left) offsetStyles.left = offset.left;
      if (offset?.top) offsetStyles.top = offset.top;

      return { ...offsetStyles, ...style };
    }, [offset, style]);

    return (
      <button
        ref={ref}
        className={cn(
          fabVariants({
            variant,
            size,
            position,
            extended: shouldExtend ? true : false,
          }),
          !isVisible && "translate-y-20 opacity-0",
          className,
        )}
        style={customStyle}
        {...props}
      >
        {children}
        {shouldExtend && label && <span className="font-medium">{label}</span>}
      </button>
    );
  },
);

FAB.displayName = "FAB";

export { FAB, fabVariants };

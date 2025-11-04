/**
 * Enhanced Skeleton Component
 * 
 * Provides customizable loading skeletons with smooth animations
 */

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  count = 1,
  ...props
}: SkeletonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "text":
        return "h-4 rounded";
      case "circular":
        return "rounded-full aspect-square";
      case "rounded":
        return "rounded-lg";
      case "rectangular":
      default:
        return "rounded-md";
    }
  };

  const style = {
    width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
    height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "animate-pulse bg-muted",
            getVariantClasses(),
            className,
          )}
          style={style}
          {...props}
        />
      ))}
    </>
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 space-y-4 border rounded-lg", className)} {...props}>
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-5/6" />
        <Skeleton variant="text" className="w-4/6" />
      </div>
    </div>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className,
  ...props 
}: { 
  rows?: number; 
  columns?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" className="flex-1 h-6" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              variant="text" 
              className="flex-1 h-12" 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * List Skeleton
 */
export function ListSkeleton({ 
  count = 5,
  className,
  ...props 
}: { 
  count?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard Stats Skeleton
 */
export function StatsSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6", className)} {...props}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="p-6 border rounded-lg space-y-3">
          <Skeleton variant="text" className="w-1/2 h-4" />
          <Skeleton variant="text" className="w-1/3 h-8" />
          <Skeleton variant="text" className="w-2/3 h-3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Employee Card Skeleton
 */
export function EmployeeCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 border rounded-lg", className)} {...props}>
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={56} height={56} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4 h-5" />
          <Skeleton variant="text" className="w-1/2 h-4" />
          <div className="flex gap-2 mt-3">
            <Skeleton variant="rounded" className="w-16 h-6" />
            <Skeleton variant="rounded" className="w-20 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Rating Card Skeleton
 */
export function RatingCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 border rounded-lg space-y-4", className)} {...props}>
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-2/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
        <Skeleton variant="rounded" className="w-12 h-6" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="rectangular" className="w-full h-3 rounded-full" />
        <div className="flex justify-between">
          <Skeleton variant="text" className="w-8 h-3" />
          <Skeleton variant="text" className="w-8 h-3" />
          <Skeleton variant="text" className="w-8 h-3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Page Header Skeleton
 */
export function PageHeaderSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <Skeleton variant="text" className="w-1/3 h-8" />
      <Skeleton variant="text" className="w-1/2 h-4" />
    </div>
  );
}


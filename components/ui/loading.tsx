import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text = "Chargement...",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="flex items-center space-x-2">
        <div
          className={cn(
            "animate-spin rounded-full border-b-2 border-primary",
            sizeClasses[size]
          )}
        ></div>
        <span className="text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

export function LoadingCard({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}




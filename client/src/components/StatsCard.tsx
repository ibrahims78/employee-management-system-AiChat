import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
  color?: "blue" | "green" | "orange" | "red";
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  className,
  color = "blue"
}: StatsCardProps) {
  
  const colors = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-200",
    green: "bg-green-500/10 text-green-600 border-green-200",
    orange: "bg-orange-500/10 text-orange-600 border-orange-200",
    red: "bg-red-500/10 text-red-600 border-red-200",
  };

  const iconColors = {
    blue: "bg-blue-600 text-white shadow-blue-500/30",
    green: "bg-green-600 text-white shadow-green-500/30",
    orange: "bg-orange-600 text-white shadow-orange-500/30",
    red: "bg-red-600 text-white shadow-red-500/30",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</h3>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-3 shadow-lg", iconColors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {/* Decorative background shape */}
      <div className={cn(
        "absolute -left-6 -bottom-6 h-24 w-24 rounded-full opacity-50 blur-2xl",
        color === 'blue' && "bg-blue-500",
        color === 'green' && "bg-green-500",
        color === 'orange' && "bg-orange-500",
        color === 'red' && "bg-red-500",
      )} />
    </div>
  );
}

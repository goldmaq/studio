import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface DataTablePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
  onButtonClick: () => void;
}

export function DataTablePlaceholder({
  icon: Icon,
  title,
  description,
  buttonLabel,
  onButtonClick,
}: DataTablePlaceholderProps) {
  return (
    <Card className="w-full shadow-sm border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="mt-4 font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={onButtonClick} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

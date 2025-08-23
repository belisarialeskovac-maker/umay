import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="w-full h-full">
      <div className="text-left mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">An overview of your workspace.</p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh] p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to CollaBoard
          </h2>
          <p className="text-muted-foreground mt-2">
            Select a page from the sidebar to view its content.
          </p>
        </div>
      </div>
    </div>
  );
}

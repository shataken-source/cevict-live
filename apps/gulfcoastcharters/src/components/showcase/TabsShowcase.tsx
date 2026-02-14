/**
 * TabsShowcase - Demonstrates tabbed content component
 */
import { ComponentDemo } from './ComponentDemo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function TabsShowcase() {
  const code = `import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content for tab 1</TabsContent>
  <TabsContent value="tab2">Content for tab 2</TabsContent>
</Tabs>`;

  return (
    <ComponentDemo
      title="Tabs"
      description="Tabbed interface for organizing content into switchable panels"
      category="Layout"
      code={code}
    >
      <Tabs defaultValue="overview" className="w-full max-w-md">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Charter Overview</CardTitle>
              <CardDescription>Quick summary of the trip</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Half-day inshore fishing. All gear included. Great for families.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Duration: 4 hours. Capacity: 6. Captain provides rods, bait, and ice.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                &ldquo;Amazing trip, caught redfish and trout!&rdquo; — 4.9/5
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ComponentDemo>
  );
}

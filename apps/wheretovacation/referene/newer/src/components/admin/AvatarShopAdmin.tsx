import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, TrendingUp, DollarSign, Users } from 'lucide-react';

export default function AvatarShopAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [itemsRes, analyticsRes] = await Promise.all([
      supabase.from('avatar_shop_items').select('*').order('category'),
      supabase.rpc('get_avatar_analytics')
    ]);

    if (itemsRes.data) setItems(itemsRes.data);
    if (analyticsRes.data) setAnalytics(analyticsRes.data);
    setLoading(false);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const itemData = {
      name: formData.get('name'),
      category: formData.get('category'),
      price_points: parseInt(formData.get('price_points') as string),
      rarity: formData.get('rarity'),
      description: formData.get('description'),
      is_active: formData.get('is_active') === 'true'
    };

    const { error } = editItem
      ? await supabase.from('avatar_shop_items').update(itemData).eq('id', editItem.id)
      : await supabase.from('avatar_shop_items').insert(itemData);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `Item ${editItem ? 'updated' : 'created'}` });
    setEditItem(null);
    loadData();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabase.from('avatar_shop_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Item deleted' });
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Avatar Shop Admin</h1>
        <Button onClick={() => setEditItem({})}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="form">
            {editItem ? 'Edit Item' : 'Add Item'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="capitalize">{item.category}</TableCell>
                    <TableCell>{item.price_points} pts</TableCell>
                    <TableCell>
                      <Badge variant={item.rarity === 'rare' ? 'default' : 'secondary'}>
                        {item.rarity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'destructive'}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditItem(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{analytics?.total_revenue || 0} pts</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Shoppers</p>
                  <p className="text-2xl font-bold">{analytics?.active_shoppers || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Purchases Today</p>
                  <p className="text-2xl font-bold">{analytics?.purchases_today || 0}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="form">
          <Card className="p-6">
            <form onSubmit={saveItem} className="space-y-4">
              <div>
                <Label>Item Name</Label>
                <Input name="name" defaultValue={editItem?.name} required />
              </div>
              <div>
                <Label>Category</Label>
                <Select name="category" defaultValue={editItem?.category || 'hat'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hat">Hat</SelectItem>
                    <SelectItem value="sunglasses">Sunglasses</SelectItem>
                    <SelectItem value="accessory">Accessory</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price (Points)</Label>
                <Input name="price_points" type="number" defaultValue={editItem?.price_points || 2} required />
              </div>
              <div>
                <Label>Rarity</Label>
                <Select name="rarity" defaultValue={editItem?.rarity || 'common'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input name="description" defaultValue={editItem?.description} />
              </div>
              <div>
                <Label>Status</Label>
                <Select name="is_active" defaultValue={editItem?.is_active ? 'true' : 'false'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save Item</Button>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

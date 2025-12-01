'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'

const supabase = createClient();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, TestTube } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookConfig {
  id?: string;
  event_type: 'purchase' | 'promotion_created' | 'shipping_update';
  url: string;
  is_active: boolean;
}

interface ShippingZone {
  id?: string;
  name: string;
  price: number;
  description?: string;
  is_active: boolean;
}

export default function AdminSettingsPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);

  // Debug: Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('Session error:', error);
      if (session?.user) {
        console.log('User email:', session.user.email);
        console.log('User ID:', session.user.id);
      }
    };
    checkAuth();
  }, []);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('webhooks');

  // New webhook form state
  const [newWebhook, setNewWebhook] = useState<WebhookConfig>({
    event_type: 'purchase',
    url: '',
    is_active: true
  });

  // New shipping zone form state
  const [newShippingZone, setNewShippingZone] = useState<ShippingZone>({
    name: '',
    price: 0,
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('Loading settings...');
      setLoading(true);

      // Load webhooks
      console.log('Loading webhooks...');
      // Load webhooks with timeout
      console.log('Loading webhooks...');
      const webhooksPromise = supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: webhookData, error: webhookError } = await Promise.race([
        webhooksPromise,
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        )
      ]);

      if (webhookError) {
        console.error('Webhook error:', webhookError);
        throw webhookError;
      }
      console.log('Webhooks loaded:', webhookData);
      setWebhooks(webhookData || []);

      // Load shipping zones with timeout
      console.log('Loading shipping zones...');
      const shippingPromise = supabase
        .from('shipping_zones')
        .select('*')
        .order('name');

      const { data: shippingData, error: shippingError } = await Promise.race([
        shippingPromise,
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        )
      ]);

      if (shippingError) {
        console.error('Shipping zones error:', shippingError);
        throw shippingError;
      }
      console.log('Shipping zones loaded:', shippingData);
      setShippingZones(shippingData || []);

    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Failed to load settings");
    } finally {
      console.log('Settings loading complete');
      setLoading(false);
    }
  };

  const saveWebhook = async () => {
    try {
      console.log('Saving webhook:', newWebhook);

      if (!newWebhook.url.trim()) {
        toast.error("Webhook URL is required");
        return;
      }

      const { data, error } = await supabase
        .from('webhook_configs')
        .insert([newWebhook])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Webhook saved successfully:', data);
      setWebhooks([data, ...webhooks]);
      setNewWebhook({
        event_type: 'purchase',
        url: '',
        is_active: true
      });

      toast.success("Webhook configuration saved");
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast.error(`Failed to save webhook configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWebhooks(webhooks.filter(w => w.id !== id));
      toast.success("Webhook configuration deleted");
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error("Failed to delete webhook configuration");
    }
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    try {
      const testPayload = {
        event: webhook.event_type,
        timestamp: new Date().toISOString(),
        test: true,
        data: {
          message: `Test webhook for ${webhook.event_type} event`
        }
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast.success(`Webhook test successful (${response.status})`);
      } else {
        toast.error(`Webhook responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error("Failed to test webhook");
    }
  };

  const saveShippingZone = async () => {
    try {
      console.log('Saving shipping zone:', newShippingZone);

      if (!newShippingZone.name.trim()) {
        toast.error("Zone name is required");
        return;
      }

      if (newShippingZone.price < 0) {
        toast.error("Price cannot be negative");
        return;
      }

      const { data, error } = await supabase
        .from('shipping_zones')
        .insert([newShippingZone])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Shipping zone saved successfully:', data);
      setShippingZones([...shippingZones, data]);
      setNewShippingZone({
        name: '',
        price: 0,
        description: '',
        is_active: true
      });

      // Trigger shipping_update webhook for new zone creation
      try {
        const webhookResponse = await fetch('/api/webhooks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'shipping_update',
            data: {
              action: 'created',
              shipping_zone: {
                id: data.id,
                name: data.name,
                price: data.price,
                description: data.description,
                is_active: data.is_active,
                created_at: data.created_at,
                updated_at: data.updated_at
              }
            }
          }),
        });

        if (webhookResponse.ok) {
          const webhookResult = await webhookResponse.json();
          console.log('Shipping zone created webhook triggered successfully:', webhookResult);
        } else {
          console.error('Failed to trigger shipping zone created webhook:', await webhookResponse.text());
        }
      } catch (webhookError) {
        console.error('Error triggering shipping zone created webhook:', webhookError);
        // Don't fail the zone creation if webhook fails
      }

      toast.success("Shipping zone saved");
    } catch (error) {
      console.error('Error saving shipping zone:', error);
      toast.error(`Failed to save shipping zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteShippingZone = async (id: string) => {
    try {
      console.log('Deleting shipping zone:', id);

      // Get the zone data before deletion for webhook
      const zoneToDelete = shippingZones.find(z => z.id === id);

      const { error } = await supabase
        .from('shipping_zones')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Shipping zone deleted successfully');
      setShippingZones(shippingZones.filter(z => z.id !== id));

      // Trigger shipping_update webhook for zone deletion
      if (zoneToDelete) {
        try {
          const webhookResponse = await fetch('/api/webhooks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'shipping_update',
              data: {
                action: 'deleted',
                shipping_zone: {
                  id: zoneToDelete.id,
                  name: zoneToDelete.name,
                  price: zoneToDelete.price,
                  description: zoneToDelete.description,
                  is_active: zoneToDelete.is_active
                }
              }
            }),
          });

          if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            console.log('Shipping zone deleted webhook triggered successfully:', webhookResult);
          } else {
            console.error('Failed to trigger shipping zone deleted webhook:', await webhookResponse.text());
          }
        } catch (webhookError) {
          console.error('Error triggering shipping zone deleted webhook:', webhookError);
          // Don't fail the deletion if webhook fails
        }
      }

      toast.success("Shipping zone deleted");
    } catch (error) {
      console.error('Error deleting shipping zone:', error);
      toast.error(`Failed to delete shipping zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleWebhookStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setWebhooks(webhooks.map(w =>
        w.id === id ? { ...w, is_active: isActive } : w
      ));

      toast.success(`Webhook ${isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating webhook status:', error);
      toast.error("Failed to update webhook status");
    }
  };

  const toggleShippingZoneStatus = async (id: string, isActive: boolean) => {
    try {
      console.log('Toggling shipping zone status:', id, isActive);

      // Get the zone data before update for webhook
      const zoneToUpdate = shippingZones.find(z => z.id === id);

      const { error } = await supabase
        .from('shipping_zones')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Shipping zone status updated successfully');
      setShippingZones(shippingZones.map(z =>
        z.id === id ? { ...z, is_active: isActive } : z
      ));

      // Trigger shipping_update webhook for status change
      if (zoneToUpdate) {
        try {
          const webhookResponse = await fetch('/api/webhooks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'shipping_update',
              data: {
                action: 'status_changed',
                shipping_zone: {
                  id: zoneToUpdate.id,
                  name: zoneToUpdate.name,
                  price: zoneToUpdate.price,
                  description: zoneToUpdate.description,
                  is_active: isActive,
                  previous_status: zoneToUpdate.is_active
                }
              }
            }),
          });

          if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            console.log('Shipping zone status changed webhook triggered successfully:', webhookResult);
          } else {
            console.error('Failed to trigger shipping zone status changed webhook:', await webhookResponse.text());
          }
        } catch (webhookError) {
          console.error('Error triggering shipping zone status changed webhook:', webhookError);
          // Don't fail the status update if webhook fails
        }
      }

      toast.success(`Shipping zone ${isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating shipping zone status:', error);
      toast.error(`Failed to update shipping zone status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage webhooks and shipping configurations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="webhooks" className="text-sm">Webhooks</TabsTrigger>
          <TabsTrigger value="shipping" className="text-sm">Shipping Zones</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhooks for purchase events, promotion creation, and shipping updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="event-type">Event Type</Label>
                  <select
                    id="event-type"
                    className="w-full p-2 border rounded-md text-sm"
                    value={newWebhook.event_type}
                    onChange={(e) => setNewWebhook({
                      ...newWebhook,
                      event_type: e.target.value as WebhookConfig['event_type']
                    })}
                  >
                    <option value="purchase">Purchase Made</option>
                    <option value="promotion_created">Promotion Created</option>
                    <option value="shipping_update">Shipping Update</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-app.com/webhook"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({
                      ...newWebhook,
                      url: e.target.value
                    })}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={saveWebhook} className="w-full text-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No webhooks configured</p>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium capitalize text-sm sm:text-base">{webhook.event_type.replace('_', ' ')}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${webhook.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 break-all">{webhook.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhook(webhook)}
                          className="flex-1 sm:flex-none"
                        >
                          <TestTube className="w-4 h-4" />
                          <span className="sm:hidden ml-1">Test</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWebhookStatus(webhook.id!, !webhook.is_active)}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          {webhook.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteWebhook(webhook.id!)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sm:hidden ml-1">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Shipping Zone</CardTitle>
              <CardDescription>
                Create shipping zones with different prices for different regions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="zone-name">Zone Name</Label>
                  <Input
                    id="zone-name"
                    placeholder="e.g., Lagos, Abuja"
                    value={newShippingZone.name}
                    onChange={(e) => setNewShippingZone({
                      ...newShippingZone,
                      name: e.target.value
                    })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="zone-price">Price (₦)</Label>
                  <Input
                    id="zone-price"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="2000"
                    value={newShippingZone.price}
                    onChange={(e) => setNewShippingZone({
                      ...newShippingZone,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="zone-description">Description</Label>
                  <Input
                    id="zone-description"
                    placeholder="Optional description"
                    value={newShippingZone.description}
                    onChange={(e) => setNewShippingZone({
                      ...newShippingZone,
                      description: e.target.value
                    })}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={saveShippingZone} className="w-full text-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Zone
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Zones</CardTitle>
            </CardHeader>
            <CardContent>
              {shippingZones.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No shipping zones configured</p>
              ) : (
                <div className="space-y-4">
                  {shippingZones.map((zone) => (
                    <div key={zone.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm sm:text-base">{zone.name}</span>
                          <span className="font-semibold text-green-600 text-sm sm:text-base">₦{zone.price.toLocaleString()}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${zone.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {zone.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {zone.description && (
                          <p className="text-sm text-gray-600 mt-1">{zone.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleShippingZoneStatus(zone.id!, !zone.is_active)}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          {zone.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteShippingZone(zone.id!)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sm:hidden ml-1">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
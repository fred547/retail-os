import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, FileText } from "lucide-react";

export default function WhatsApp() {
  const { data: messages, isLoading: loadingMsgs } = trpc.whatsapp.listMessages.useQuery({ limit: 50 });
  const { data: templates, isLoading: loadingTpl } = trpc.whatsapp.listTemplates.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">Customer messaging and automated notifications</p>
      </div>

      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Messages</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-3.5 w-3.5 mr-1" /> Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Message Log</CardTitle></CardHeader>
            <CardContent>
              {loadingMsgs ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-2">
                  {messages.map((m: any) => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${m.direction === 'inbound' ? 'bg-green-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{m.phone}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{m.content ?? "—"}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${m.status === 'delivered' ? 'bg-green-500/20 text-green-400' : m.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{m.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Connect WhatsApp Business API to start messaging.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Message Templates</CardTitle></CardHeader>
            <CardContent>
              {loadingTpl ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : templates && templates.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.map((t: any) => (
                    <div key={t.id} className="p-4 rounded-lg bg-secondary/30 border border-border/40">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">{t.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">{t.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.bodyTemplate}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No templates configured yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

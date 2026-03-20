import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCog, ClipboardList } from "lucide-react";

export default function Staff() {
  const { data: staffList, isLoading } = trpc.staff.list.useQuery();
  const { data: tasks, isLoading: loadingTasks } = trpc.staff.listTasks.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage team members, shifts, and tasks</p>
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team"><UserCog className="h-3.5 w-3.5 mr-1" /> Team</TabsTrigger>
          <TabsTrigger value="tasks"><ClipboardList className="h-3.5 w-3.5 mr-1" /> Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Staff Directory</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : staffList && staffList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-3">Name</th><th className="text-left py-3 px-3">Role</th><th className="text-left py-3 px-3">Department</th><th className="text-left py-3 px-3">Position</th>
                    </tr></thead>
                    <tbody>
                      {staffList.map((s: any) => (
                        <tr key={s.user.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-3 font-medium">{s.user.name ?? "—"}</td>
                          <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>{s.user.role}</span></td>
                          <td className="py-3 px-3 text-muted-foreground">{s.profile?.department ?? "—"}</td>
                          <td className="py-3 px-3 text-muted-foreground">{s.profile?.position ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No staff members yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Task Board</CardTitle></CardHeader>
            <CardContent>
              {loadingTasks ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.description ?? ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : t.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-secondary text-secondary-foreground'}`}>{t.priority}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.status === 'completed' ? 'bg-green-500/20 text-green-400' : t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks assigned yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

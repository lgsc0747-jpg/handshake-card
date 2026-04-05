import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Crown,
  Shield,
  ShieldCheck,
  Search,
  Users,
  ArrowUpDown,
} from "lucide-react";

interface AdminUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email_public: string | null;
  avatar_url: string | null;
  created_at: string;
  plan: "free" | "pro";
  started_at: string | null;
  roles: string[];
}

const AdminPage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | "free" | "pro">("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "plan" | "role";
    userId: string;
    userName: string;
    value: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("admin-manage", {
      body: { action: "list_users" },
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } else {
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const handleAction = async () => {
    if (!confirmDialog) return;
    setActionLoading(true);

    const body =
      confirmDialog.type === "plan"
        ? {
            action: "update_plan",
            target_user_id: confirmDialog.userId,
            plan: confirmDialog.value,
          }
        : {
            action: "assign_role",
            target_user_id: confirmDialog.userId,
            role: confirmDialog.value,
          };

    const { error } = await supabase.functions.invoke("admin-manage", {
      body,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Action failed",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description:
          confirmDialog.type === "plan"
            ? `Plan updated to ${confirmDialog.value}`
            : `Role updated to ${confirmDialog.value}`,
      });
      fetchUsers();
    }

    setActionLoading(false);
    setConfirmDialog(null);
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email_public ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  if (adminLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="w-12 h-12 text-destructive" />
          <h1 className="text-xl font-display font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            You do not have admin privileges.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const totalPro = users.filter((u) => u.plan === "pro").length;
  const totalAdmins = users.filter((u) => u.roles.includes("admin")).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user subscriptions and assign admin roles
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{totalPro}</p>
                <p className="text-xs text-muted-foreground">Pro Subscribers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{totalAdmins}</p>
                <p className="text-xs text-muted-foreground">Admin Users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display">
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={filterPlan}
                onValueChange={(v) =>
                  setFilterPlan(v as "all" | "free" | "pro")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                  <SelectItem value="pro">Pro Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Username</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Joined</TableHead>
                    <TableHead className="text-xs text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {(u.display_name ?? "?")[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium truncate max-w-[120px]">
                              {u.display_name ?? "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          @{u.username ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.plan === "pro" ? "default" : "secondary"}
                            className={
                              u.plan === "pro"
                                ? "bg-amber-500 text-white border-0"
                                : ""
                            }
                          >
                            {u.plan === "pro" ? (
                              <Crown className="w-3 h-3 mr-1" />
                            ) : null}
                            {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.roles.includes("admin") ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/50 text-emerald-500"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              User
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {/* Plan toggle */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  type: "plan",
                                  userId: u.user_id,
                                  userName: u.display_name ?? u.username ?? "User",
                                  value: u.plan === "pro" ? "free" : "pro",
                                })
                              }
                            >
                              <ArrowUpDown className="w-3 h-3 mr-1" />
                              {u.plan === "pro" ? "Downgrade" : "Upgrade"}
                            </Button>
                            {/* Role toggle */}
                            {u.user_id !== user?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    type: "role",
                                    userId: u.user_id,
                                    userName:
                                      u.display_name ?? u.username ?? "User",
                                    value: u.roles.includes("admin")
                                      ? "user"
                                      : "admin",
                                  })
                                }
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                {u.roles.includes("admin")
                                  ? "Remove Admin"
                                  : "Make Admin"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {users.length} users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmDialog?.open}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "plan"
                ? "Change Subscription Plan"
                : "Change User Role"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDialog?.type === "plan" ? (
              <>
                Are you sure you want to{" "}
                <strong>
                  {confirmDialog.value === "pro" ? "upgrade" : "downgrade"}
                </strong>{" "}
                <strong>{confirmDialog?.userName}</strong> to{" "}
                <Badge
                  variant={
                    confirmDialog.value === "pro" ? "default" : "secondary"
                  }
                  className={
                    confirmDialog.value === "pro"
                      ? "bg-amber-500 text-white border-0"
                      : ""
                  }
                >
                  {confirmDialog.value === "pro" ? (
                    <Crown className="w-3 h-3 mr-1" />
                  ) : null}
                  {confirmDialog?.value?.charAt(0).toUpperCase() +
                    (confirmDialog?.value?.slice(1) ?? "")}
                </Badge>
                ?
              </>
            ) : (
              <>
                Are you sure you want to{" "}
                {confirmDialog?.value === "admin" ? (
                  <>
                    grant <strong>admin privileges</strong> to
                  </>
                ) : (
                  <>
                    remove <strong>admin privileges</strong> from
                  </>
                )}{" "}
                <strong>{confirmDialog?.userName}</strong>?
                {confirmDialog?.value === "admin" && (
                  <span className="block mt-2 text-xs text-destructive">
                    ⚠️ Admins can manage all users, plans, and roles.
                  </span>
                )}
              </>
            )}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={actionLoading}>
              {actionLoading && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminPage;

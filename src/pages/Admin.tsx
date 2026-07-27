import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  user_id: string | null;
  email: string | null;
  event: string;
  detail: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const EVENTS = [
  "otp_sent",
  "otp_verified",
  "otp_invalid_code",
  "otp_invalid_format",
  "otp_expired",
  "otp_locked",
  "otp_rate_limited",
  "otp_unauthorized",
];

const successEvents = new Set(["otp_sent", "otp_verified"]);

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [userQuery, setUserQuery] = useState("");
  const [event, setEvent] = useState("all");
  const [ip, setIp] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (error) {
          setIsAdmin(false);
          return;
        }
        setIsAdmin(Boolean(data));
      });
  }, [user, authLoading, navigate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("otp_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (userQuery.trim()) {
        const term = userQuery.trim();
        const uuidLike = /^[0-9a-f-]{36}$/i.test(term);
        query = uuidLike
          ? query.eq("user_id", term)
          : query.ilike("email", `%${term}%`);
      }
      if (event !== "all") query = query.eq("event", event);
      if (ip.trim()) query = query.ilike("ip_address", `%${ip.trim()}%`);
      if (from) query = query.gte("created_at", new Date(from).toISOString());
      if (to) query = query.lte("created_at", new Date(to).toISOString());

      const { data, error } = await query;
      if (error) throw error;
      setRows((data as AuditRow[]) ?? []);
    } catch (e) {
      toast.error("Couldn't load audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const resetFilters = () => {
    setUserQuery("");
    setEvent("all");
    setIp("");
    setFrom("");
    setTo("");
  };

  const summary = useMemo(() => {
    const failures = rows.filter((r) => !successEvents.has(r.event)).length;
    return { total: rows.length, failures };
  }, [rows]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            Your account doesn't have permission to view this page.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>Back to app</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">OTP audit log</h1>
            <p className="text-sm text-muted-foreground">Internal security investigation tools</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Search by user, outcome, IP address, or time range.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="user">User (email or ID)</Label>
                <Input
                  id="user"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <Select value={event} onValueChange={setEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="All outcomes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outcomes</SelectItem>
                    {EVENTS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ip">IP address</Label>
                <Input id="ip" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="203.0.113." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="from">From</Label>
                <Input id="from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={fetchLogs} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={resetFilters} disabled={loading}>
                Reset
              </Button>
              <Button variant="ghost" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {summary.total} event{summary.total === 1 ? "" : "s"}
            </CardTitle>
            <Badge variant={summary.failures ? "destructive" : "secondary"}>
              {summary.failures} failed
            </Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Outcome</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {loading ? "Loading…" : "No matching events"}
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="truncate max-w-[200px]">{r.email || "—"}</div>
                      <div className="truncate max-w-[200px] text-xs text-muted-foreground">
                        {r.user_id || ""}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={successEvents.has(r.event) ? "secondary" : "destructive"}>
                        {r.event}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {r.ip_address || "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      <div className="max-w-[280px] truncate" title={r.detail || ""}>
                        {r.detail || "—"}
                      </div>
                      <div className="max-w-[280px] truncate text-xs" title={r.user_agent || ""}>
                        {r.user_agent || ""}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;

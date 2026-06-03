import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
                                                             
import { apiClient, AssetApi, TakeHomeRequestApi } from "@/services/apiClient";
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Laptop,
  Monitor,
  Smartphone,
  Keyboard,
  HardDrive,
  Headphones,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Upload,
  Home,
  Inbox,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Protected } from "@/components/common/ProtectedRoute";
import { AssetsAction } from "@/permissions/permission";

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.2, 0, 0, 1] },
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
type AssetStatus = "Assigned" | "Available" | "Under Maintenance" | "Retired";

interface EmployeeApi {
  id: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  department?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeStatus = (raw: string): AssetStatus => {
  const map: Record<string, AssetStatus> = {
    assigned: "Assigned",
    available: "Available",
    under_maintenance: "Under Maintenance",
    "under maintenance": "Under Maintenance",
    maintenance: "Under Maintenance",
    retired: "Retired",
  };
  return map[raw?.toLowerCase()] ?? (raw as AssetStatus);
};

const statusClass: Record<AssetStatus, string> = {
  Assigned: "status-active",
  Available: "bg-primary/10 text-primary border-primary/20",
  "Under Maintenance": "status-pending",
  Retired: "status-inactive",
};

const typeIcons: Record<string, React.ElementType> = {
  Laptop,
  Monitor,
  Mobile: Smartphone,
  Keyboard,
  "Hard Drive": HardDrive,
  Headset: Headphones,
};

const assetTypes = [
  "Laptop",
  "Monitor",
  "Mobile",
  "Keyboard",
  "Hard Drive",
  "Headset",
  "Other",
];

function toDateStr(val: unknown): string {
  if (!val) return "";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

const mapAsset = (a: AssetApi): Asset => ({
  id: a.id,
  assetId: a.asset_id,
  name: a.name,
  type: a.type ?? a.category ?? "Other",
  serialNumber: a.serial_number ?? "",
  assigned_date: a.assigned_date,
  return_date: a.return_date,
  reviewedBy: a.reviewer?.name ?? a.reviewed_by_user_id ?? null,
  reviewedAt: a.reveiwed_at ?? null,
  assignedTo: a.employee
    ? `${a.employee.first_name} ${a.employee.last_name}`
    : null,
  assignedToId: a.employee?.id ?? null,
  department: a.employee?.department ?? null,
  purchaseDate: a.purchase_date,
  status: normalizeStatus(a.status),
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function AssetManagement() {
  const { isHR } = useRole();

  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<
    { id: string; name: string; department?: string }[]
  >([]);
  const [addDialog, setAddDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState<Asset | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editDialog, setEditDialog] = useState<Asset | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortAssetId, setSortAssetId] = useState<"asc" | "desc" | null>(null);
  const [sortAssetName, setSortAssetName] = useState<"asc" | "desc" | null>(
    null,
  );
  const [inboxSort, setInboxSort] = useState({
    col: "",
    dir: "asc" as "asc" | "desc",
  });
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(
    null,
  );
  const [assetRequestDialog, setAssetRequestDialog] = useState(false);
  const [requestDialog, setRequestDialog] = useState<AssetApi | null>(null);
  const [reqDraft, setReqDraft] = useState({
    reason: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  });
  const [employeeAssets, setEmployeeAssets] = useState<AssetApi[]>([]);
  const [assetRequest, setAssetRequest] = useState({
    type: "",
    name: "",
    reason: "",
  });
  const [requests, setRequests] = useState<TakeHomeRequestApi[]>([]);
  const [takeHomeRequests, setTakeHomeRequests] = useState<
    TakeHomeRequestApi[]
  >([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [inboxDialog, setInboxDialog] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);

  const [newAsset, setNewAsset] = useState({
    assetId: "",
    name: "",
    type: "",
    serialNumber: "",
    purchaseDate: "",
  });
  const [editAsset, setEditAsset] = useState({
    assetId: "",
    name: "",
    type: "",
    serialNumber: "",
    purchaseDate: "",
  });
  const [assignTo, setAssignTo] = useState("");

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchAssets = async () => {
    try {
      const res = await apiClient.getAssets();
      setAssets((res.data ?? []).map(mapAsset));
    } catch (err) {
      console.error("Failed to fetch assets", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.getEmployees();
      const list: EmployeeApi[] = (res.data as EmployeeApi[]) ?? [];
      setEmployees(
        list.map((e) => ({
          id: e.id,
          name: e.fullName ?? e.full_name ?? e.name ?? e.id,
          department: e.department,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const fetchTakeHomeRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await apiClient.getTakeHomeAssetRequest();
      setTakeHomeRequests(res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (isHR) {
      fetchTakeHomeRequests();
    }
  }, [isHR]);

  useEffect(() => {
    if (!isHR) {
      apiClient.getMe().then((res) => {
        const empId = res.data?.employee?.id;
        setCurrentEmployeeId(empId ?? null);
        if (empId) {
          apiClient.getAssets({ assigned_to: empId }).then((res) => {
            setEmployeeAssets(res.data ?? []);
          });
        }
      });
    }
  }, [isHR]);

  useEffect(() => {
    if (!isHR) {
      apiClient
        .getMyTakeHomeRequests()
        .then((res) => setRequests(res.data ?? []))
        .catch(console.error);
    }
  }, [isHR]);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const pendingRequests = takeHomeRequests.filter(
    (r) => r.status === "pending",
  );
  const sortedTakeHomeRequests = [...takeHomeRequests].sort((a, b) => {
    const dir = inboxSort.dir === "asc" ? 1 : -1;
    if (inboxSort.col === "employee") {
      const na = `${a.asset?.employee?.first_name} ${a.asset?.employee?.last_name}`;
      const nb = `${b.asset?.employee?.first_name} ${b.asset?.employee?.last_name}`;
      return na.localeCompare(nb) * dir;
    }
    if (inboxSort.col === "asset")
      return a.asset.name.localeCompare(b.asset.name) * dir;
    if (inboxSort.col === "period")
      return (a.start_date > b.start_date ? 1 : -1) * dir;
    return 0;
  });

  const filtered = assets
    .filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.assetId?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
        a.id.toLowerCase().includes(search.toLowerCase()) ||
        (a.serialNumber?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
        (a.assignedTo?.toLowerCase() ?? "").includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || a.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortAssetId) {
        const idA = (a.assetId ?? "").toLowerCase();
        const idB = (b.assetId ?? "").toLowerCase();
        return sortAssetId === "asc"
          ? idA.localeCompare(idB)
          : idB.localeCompare(idA);
      }
      if (sortAssetName) {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortAssetName === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      return 0;
    });

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleReturnAsset = async (assetId: string) => {
    try {
      await apiClient.unassignAsset(assetId);
      if (currentEmployeeId) {
        const res = await apiClient.getAssets({
          assigned_to: currentEmployeeId,
        });
        setEmployeeAssets(res.data ?? []);
      }
      toast({ title: "Asset returned" });
    } catch (err) {
      toast({ title: "Failed to return asset", variant: "destructive" });
    }
  };

  const handleRequestTakeHome = async () => {
    const isOverlapping = requests.some((r) => {
      const existingStart = new Date(r.start_date);
      const existingEnd = new Date(r.end_date);

      const newStart = new Date(reqDraft.startDate);
      const newEnd = new Date(reqDraft.endDate);

      return (
        (newStart >= existingStart && newStart <= existingEnd) ||
        (newEnd >= existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });

    if (isOverlapping) {
      toast({
        title: "Date conflict",
        description: "You already have a request in this date range",
        variant: "destructive",
      });
      return;
    }

    if (!reqDraft.reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    if (!reqDraft.startDate || !reqDraft.endDate) {
      toast({ title: "Dates are required", variant: "destructive" });
      return;
    }
    if (new Date(reqDraft.endDate) < new Date(reqDraft.startDate)) {
      toast({
        title: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    if (!requestDialog?.id) {
      toast({ title: "Asset not selected", variant: "destructive" });
      return;
    }
    try {
      await apiClient.createTakeHomeAssetRequest(requestDialog.id, {
        reason: reqDraft.reason,
        start_date: reqDraft.startDate,
        end_date: reqDraft.endDate,
      });
      toast({
        title: "Request submitted",
        description: "HR will review your take-home request.",
      });
      setRequestDialog(null);
      setReqDraft({
        reason: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
      });
      const res = await apiClient.getMyTakeHomeRequests();
      setRequests(res.data ?? []);
    } catch {
      toast({ title: "Failed to submit request", variant: "destructive" });
    }
  };

  const handleRequestAsset = () => {
    if (!assetRequest.type || !assetRequest.name) return;
    setAssetRequest({ type: "", name: "", reason: "" });
    setAssetRequestDialog(false);
    toast({ title: "Asset requested", description: "Pending HR approval." });
  };

  const handleAddAsset = async () => {
    if (!newAsset.assetId.trim()) {
      toast({ title: "Asset ID is required", variant: "destructive" });
      return;
    }
    if (!newAsset.name.trim()) {
      toast({ title: "Asset name is required", variant: "destructive" });
      return;
    }
    if (!newAsset.type) {
      toast({ title: "Asset type is required", variant: "destructive" });
      return;
    }
    const isDuplicate = assets.some(
      (a) => a.assetId?.toLowerCase() === newAsset.assetId.trim().toLowerCase(),
    );
    if (isDuplicate) {
      toast({
        title: "Asset ID already exists",
        description: `"${newAsset.assetId}" is already in use.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await apiClient.createAsset({
        asset_id: newAsset.assetId,
        name: newAsset.name,
        category: newAsset.type,
        serial_number: newAsset.serialNumber || null,
        purchase_date: newAsset.purchaseDate || null,
        status: "available",
      });
      await fetchAssets();
      setNewAsset({
        assetId: "",
        name: "",
        type: "",
        serialNumber: "",
        purchaseDate: "",
      });
      setAddDialog(false);
      toast({
        title: "Asset added",
        description: `${newAsset.name} added successfully.`,
      });
    } catch {
      toast({ title: "Failed to add asset", variant: "destructive" });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await apiClient.deleteAsset(id);
      await fetchAssets();
      toast({ title: "Asset deleted" });
    } catch {
      toast({ title: "Failed to delete asset", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.exportAssets();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "assets.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast({
        title: "Export failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await apiClient.importAssets(file);
      toast({ title: "Import successful" });
      fetchAssets();
    } catch (err) {
      toast({
        title: "Import failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAssign = async () => {
    if (!assignDialog || !assignTo) return;
    try {
      await apiClient.assignAsset(assignDialog.id, assignTo);
      await fetchAssets();
      setAssignDialog(null);
      setAssignTo("");
      toast({ title: "Asset assigned" });
    } catch {
      toast({ title: "Failed to assign asset", variant: "destructive" });
    }
  };

  const openEditDialog = (asset: Asset) => {
    setEditAsset({
      assetId: asset.assetId || "",
      name: asset.name,
      type: asset.type,
      serialNumber: asset.serialNumber || "",
      purchaseDate: asset.purchaseDate || "",
    });
    setEditDialog(asset);
  };

  const handleUpdateAsset = async () => {
    if (!editDialog) return;
    if (!editAsset.assetId.trim()) {
      toast({ title: "Asset ID is required", variant: "destructive" });
      return;
    }
    if (!editAsset.name.trim()) {
      toast({ title: "Asset name is required", variant: "destructive" });
      return;
    }
    const isDuplicate = assets.some(
      (a) =>
        a.assetId?.toLowerCase() === editAsset.assetId.trim().toLowerCase() &&
        a.id !== editDialog.id,
    );
    if (isDuplicate) {
      toast({
        title: "Asset ID already exists",
        description: `"${editAsset.assetId}" is already in use.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await apiClient.updateAsset(editDialog.id, {
        asset_id: editAsset.assetId,
        name: editAsset.name,
        category: editAsset.type,
        serial_number: editAsset.serialNumber || null,
        purchase_date: editAsset.purchaseDate || null,
      });
      await fetchAssets();
      setEditDialog(null);
      toast({
        title: "Asset updated",
        description: `${editAsset.name} updated successfully.`,
      });
    } catch {
      toast({ title: "Failed to update asset", variant: "destructive" });
    }
  };

  const handleChangeStatus = async (id: string, status: AssetStatus) => {
    try {
      const statusMap: Record<AssetStatus, string> = {
        Assigned: "assigned",
        Available: "available",
        "Under Maintenance": "maintenance",
        Retired: "retired",
      };
      await apiClient.updateAsset(id, { status: statusMap[status] });
      await fetchAssets();
      toast({ title: `Status changed to ${status}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleReviewTakeHome = async (
    id: string,
    status: "approved" | "rejected",
  ) => {
    try {
      await apiClient.reviewTakeHomeRequest(id, { status });
      await Promise.all([fetchTakeHomeRequests(), fetchAssets()]);
      toast({
        title: status === "approved" ? "Request approved" : "Request rejected",
      });
    } catch {
      toast({ title: "Failed to review request", variant: "destructive" });
    }
  };

  // ─── Summary stats ──────────────────────────────────────────────────────────
  const summaryStats = [
    { label: "Total Assets", value: assets.length, color: "text-foreground" },
    {
      label: "Assigned",
      value: assets.filter((a) => a.status === "Assigned").length,
      color: "text-success",
    },
    {
      label: "Available",
      value: assets.filter((a) => a.status === "Available").length,
      color: "text-primary",
    },
    {
      label: "Maintenance",
      value: assets.filter((a) => a.status === "Under Maintenance").length,
      color: "text-warning",
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        {isHR ? (
          <div>
            <h1 className="text-lg font-semibold">Asset Management</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage company assets
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-lg font-semibold">My Assets</h1>
            <p className="text-sm text-muted-foreground">
              Devices assigned to you. Request take-home for remote access.
            </p>
          </div>
        )}

        {isHR && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 press-effect"
              onClick={() => setInboxDialog(true)}
            >
              <Inbox className="w-3.5 h-3.5" /> Take-home Requests
              {pendingRequests.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-mono-data">
                  {pendingRequests.length}
                </span>
              )}
            </Button>

            {/* Add Asset dialog */}
            <Protected allPermissions={[AssetsAction.Create]}>
              {" "}
              <Dialog open={addDialog} onOpenChange={setAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 press-effect">
                    <Plus className="w-3.5 h-3.5" /> Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Asset ID *
                      </label>
                      <Input
                        value={newAsset.assetId}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, assetId: e.target.value })
                        }
                        className="h-8 text-sm"
                        placeholder="e.g., LAP-001"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Asset Name *
                      </label>
                      <Input
                        value={newAsset.name}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, name: e.target.value })
                        }
                        className="h-8 text-sm"
                        placeholder='e.g., MacBook Pro 16"'
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Type *
                        </label>
                        <Select
                          value={newAsset.type}
                          onValueChange={(v) =>
                            setNewAsset({ ...newAsset, type: v })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {assetTypes.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Serial Number
                        </label>
                        <Input
                          value={newAsset.serialNumber}
                          onChange={(e) =>
                            setNewAsset({
                              ...newAsset,
                              serialNumber: e.target.value,
                            })
                          }
                          placeholder="e.g., SN-123456789"
                          className="h-8 text-xs font-mono-data"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Purchase Date
                        </label>
                        <Input
                          type="date"
                          value={newAsset.purchaseDate}
                          onChange={(e) =>
                            setNewAsset({
                              ...newAsset,
                              purchaseDate: e.target.value,
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddAsset}>
                        Add Asset
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </Protected>
          </div>
        )}
      </motion.div>

      {/* Summary Cards */}
      {isHR && (
        <motion.div variants={item} className="grid grid-cols-4 gap-3">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-4"
            >
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p
                className={`text-2xl font-semibold font-mono-data ${stat.color}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      {isHR && (
        <motion.div variants={item} className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, serial, assignee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm bg-card border-border"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5 h-8 text-muted-foreground press-effect"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </Button>
          {showFilters && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Status
                </SelectItem>
                {(
                  [
                    "Assigned",
                    "Available",
                    "Under Maintenance",
                    "Retired",
                  ] as AssetStatus[]
                ).map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="gap-1.5"
            >
              Export Excel
            </Button>

            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 press-effect"
              onClick={() => importRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
          </>
        </motion.div>
      )}

      {/* HR Assets Table */}

      {isHR && (
        <motion.div
          variants={item}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <table className="nexus-table">
            <thead>
              <tr>
                <th>
                  <button
                    className="flex items-center gap-1 text-xs font-medium hover:text-foreground"
                    onClick={() => {
                      setSortAssetName(null);
                      setSortAssetId((prev) =>
                        prev === "asc"
                          ? "desc"
                          : prev === "desc"
                            ? null
                            : "asc",
                      );
                    }}
                  >
                    Asset ID
                    {sortAssetId === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-primary" />
                    ) : sortAssetId === "desc" ? (
                      <ArrowDown className="w-3 h-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th>
                  <button
                    className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
                    onClick={() => {
                      setSortAssetId(null);
                      setSortAssetName((prev) =>
                        prev === "asc"
                          ? "desc"
                          : prev === "desc"
                            ? null
                            : "asc",
                      );
                    }}
                  >
                    Asset
                    {sortAssetName === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-primary" />
                    ) : sortAssetName === "desc" ? (
                      <ArrowDown className="w-3 h-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th>Serial Number</th>
                <th>Assigned To</th>
                <th>Department</th>
                <th>Assigned Date</th>
                <th>Return Date</th>
                <th>Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No assets found
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => {
                  const Icon = typeIcons[asset.type] || Package;
                  return (
                    <tr key={asset.id}>
                      <td className="font-mono-data text-xs text-muted-foreground">
                        {asset.assetId || "—"}
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {asset.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {asset.type}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono-data text-xs text-muted-foreground">
                        {asset.serialNumber || "—"}
                      </td>
                      <td>
                        {asset.assignedTo ? (
                          <p className="text-sm">{asset.assignedTo}</p>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {asset.department || "—"}
                      </td>
                      <td className="text-xs font-mono-data text-muted-foreground">
                        {toDateStr(asset.assigned_date) || "—"}
                      </td>
                      <td className="text-xs font-mono-data text-muted-foreground">
                        {toDateStr(asset.return_date) || "Not returned"}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${statusClass[asset.status as AssetStatus] ?? "status-pending"}`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-accent transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {asset.status === "Available" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setAssignDialog(asset);
                                  setAssignTo("");
                                }}
                              >
                                Assign to Employee
                              </DropdownMenuItem>
                            )}
                            {asset.status === "Assigned" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await apiClient.unassignAsset(asset.id);
                                    await fetchAssets();
                                    toast({
                                      title: "Asset returned",
                                      description:
                                        "Asset successfully unassigned",
                                    });
                                  } catch (err) {
                                    toast({
                                      title: "Return failed",
                                      description: err.message,
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Unassign
                              </DropdownMenuItem>
                            )}
                            {asset.status !== "Under Maintenance" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeStatus(
                                    asset.id,
                                    "Under Maintenance",
                                  )
                                }
                              >
                                Send to Maintenance
                              </DropdownMenuItem>
                            )}
                            {asset.status === "Under Maintenance" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeStatus(asset.id, "Available")
                                }
                              >
                                Mark as Available
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => openEditDialog(asset)}
                            >
                              Edit Asset
                            </DropdownMenuItem>
                            {asset.status !== "Retired" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeStatus(asset.id, "Retired")
                                }
                              >
                                Retire Asset
                              </DropdownMenuItem>
                            )}
                            {
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteAsset(asset.id)}
                              >
                                Delete Asset
                              </DropdownMenuItem>
                            }
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Employee: Assigned Devices */}
      {!isHR && (
        <div className="bg-card border border-border rounded-lg">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-md font-semibold">
              Assigned Devices{" "}
              <span className="text-sm text-muted-foreground">
                {employeeAssets.length}
              </span>
            </h3>
            <Dialog
              open={assetRequestDialog}
              onOpenChange={setAssetRequestDialog}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 press-effect">
                  <Plus className="w-3.5 h-3.5" /> Request Asset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request New Asset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Asset Type
                    </label>
                    <Select
                      value={assetRequest.type}
                      onValueChange={(v) =>
                        setAssetRequest({ ...assetRequest, type: v })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Laptop",
                          "Monitor",
                          "Keyboard",
                          "Mouse",
                          "Mobile",
                          "Headset",
                          "Other",
                        ].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Asset Name
                    </label>
                    <Input
                      value={assetRequest.name}
                      onChange={(e) =>
                        setAssetRequest({
                          ...assetRequest,
                          name: e.target.value,
                        })
                      }
                      placeholder='e.g., MacBook Pro 16"'
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Reason
                    </label>
                    <Textarea
                      value={assetRequest.reason}
                      onChange={(e) =>
                        setAssetRequest({
                          ...assetRequest,
                          reason: e.target.value,
                        })
                      }
                      placeholder="Why do you need this asset?"
                      className="text-sm min-h-[80px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssetRequestDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleRequestAsset}>
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <table className="nexus-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Serial Number</th>
                <th>Assigned Date</th>
                <th>Status</th>
                <th className="w-40">Action</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {employeeAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    No assets assigned yet.
                  </td>
                </tr>
              ) : (
                employeeAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="text-xs font-mono-data text-muted-foreground">
                      {asset.asset_id}
                    </td>
                    <td className="text-sm font-medium">{asset.name}</td>
                    <td className="text-xs text-muted-foreground">
                      {asset.category ?? asset.type}
                    </td>
                    <td className="text-xs font-mono-data text-muted-foreground">
                      {asset.serial_number || "—"}
                    </td>
                    <td className="text-xs font-mono-data text-muted-foreground">
                      {toDateStr(asset.assigned_date) || "—"}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${asset.status === "assigned" ? "status-active" : "status-pending"}`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td>
                      {asset.status === "assigned" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => setRequestDialog(asset)}
                        >
                          <Home className="w-3 h-3" /> Request Take-Home
                        </Button>
                      )}
                    </td>
                    <td>
                      {asset.status === "assigned" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => handleReturnAsset(asset.id)}
                        >
                          Return
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Take-Home Request Dialog */}
      <Dialog
        open={!!requestDialog}
        onOpenChange={(o) => !o && setRequestDialog(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request to Take Asset Home</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {requestDialog?.name} ·{" "}
              <span className="font-mono-data">{requestDialog?.asset_id}</span>
            </p>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={reqDraft.startDate}
                  onChange={(e) =>
                    setReqDraft({ ...reqDraft, startDate: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  End Date *
                </label>
                <Input
                  type="date"
                  value={reqDraft.endDate}
                  onChange={(e) =>
                    setReqDraft({ ...reqDraft, endDate: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Reason *
              </label>
              <Textarea
                rows={3}
                value={reqDraft.reason}
                onChange={(e) =>
                  setReqDraft({ ...reqDraft, reason: e.target.value })
                }
                placeholder="e.g., Remote work for project deadline, on-call support."
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestDialog(null)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleRequestTakeHome}>
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee: My Take-home Requests */}
      {!isHR && (
        <motion.div
          variants={item}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">My Take-home Requests</h2>
          </div>
          {requests.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              No requests submitted yet.
            </div>
          ) : (
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Asset</th>
                  <th>Period</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Reviewed By </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="text-[11px] text-muted-foreground font-mono-data">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="text-xs">
                      <div className="font-medium">{r.asset.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono-data">
                        {r.asset.asset_id}
                      </div>
                    </td>
                    <td className="font-mono-data text-xs">
                      {r.start_date?.split("T")[0]} →{" "}
                      {r.end_date?.split("T")[0]}
                    </td>
                    <td
                      className="text-xs text-muted-foreground max-w-[260px] truncate"
                      title={r.reason}
                    >
                      {r.reason}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          r.status === "approved"
                            ? "status-active"
                            : r.status === "rejected"
                              ? "status-resigned"
                              : "status-pending"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {r.status === "approved" || r.status === "rejected"
                        ? (r.asset?.reviewer?.name ?? "—")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {/* Assign Dialog */}
      {isHR && (
        <Dialog
          open={!!assignDialog}
          onOpenChange={() => setAssignDialog(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <p className="text-sm">
                Assign <span className="font-medium">{assignDialog?.name}</span>{" "}
                to:
              </p>
              {employees.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Loading employees…
                </p>
              ) : (
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                        {e.department ? ` · ${e.department}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignDialog(null)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAssign} disabled={!assignTo}>
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {isHR && (
        <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Asset ID *
                </label>
                <Input
                  value={editAsset.assetId}
                  onChange={(e) =>
                    setEditAsset({ ...editAsset, assetId: e.target.value })
                  }
                  placeholder="Asset ID"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Asset Name *
                </label>
                <Input
                  value={editAsset.name}
                  onChange={(e) =>
                    setEditAsset({ ...editAsset, name: e.target.value })
                  }
                  placeholder="Asset Name"
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Type *
                  </label>
                  <Select
                    value={editAsset.type}
                    onValueChange={(v) =>
                      setEditAsset({ ...editAsset, type: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Serial Number
                  </label>
                  <Input
                    value={editAsset.serialNumber}
                    onChange={(e) =>
                      setEditAsset({
                        ...editAsset,
                        serialNumber: e.target.value,
                      })
                    }
                    placeholder="e.g., SN-123456789"
                    className="h-8 text-xs font-mono-data"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Purchase Date
                  </label>
                  <Input
                    type="date"
                    value={editAsset.purchaseDate}
                    onChange={(e) =>
                      setEditAsset({
                        ...editAsset,
                        purchaseDate: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialog(null)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdateAsset}>
                  Update Asset
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* HR: Take-home Requests Inbox */}

      <Dialog open={inboxDialog} onOpenChange={setInboxDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Asset Take-home Requests</DialogTitle>
            <DialogDescription>
              Approve or reject employee requests to take assigned assets home
              for remote access.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            {loadingRequests ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                Loading…
              </div>
            ) : takeHomeRequests.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                No requests submitted yet.
              </div>
            ) : (
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>Submitted</th>

                    {(["employee", "asset", "period"] as const).map((col) => (
                      <th key={col}>
                        <button
                          className="flex items-center gap-1 text-xs font-medium hover:text-foreground capitalize"
                          onClick={() =>
                            setInboxSort({
                              col,
                              dir:
                                inboxSort.col === col && inboxSort.dir === "asc"
                                  ? "desc"
                                  : "asc",
                            })
                          }
                        >
                          {col}
                          {inboxSort.col === col ? (
                            inboxSort.dir === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-primary" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                      </th>
                    ))}
                    <th>Reason</th>
                    <th>Reviewed By</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTakeHomeRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="text-[11px] text-muted-foreground font-mono-data">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="text-xs">
                        <div className="font-medium">
                          {r.asset?.employee
                            ? `${r.asset.employee.first_name} ${r.asset.employee.last_name}`
                            : "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono-data">
                          {r.asset?.employee?.employee_id ?? ""}
                        </div>
                      </td>
                      <td className="text-xs">
                        <div className="font-medium">{r.asset.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono-data">
                          {r.asset.asset_id}
                        </div>
                      </td>

                      <td className="font-mono-data text-xs">
                        {r.start_date?.split("T")[0]} →{" "}
                        {r.end_date?.split("T")[0]}
                      </td>
                      <td
                        className="text-xs text-muted-foreground max-w-[220px] truncate"
                        title={r.reason}
                      >
                        {r.reason}
                      </td>

                      <td className="text-xs text-muted-foreground">
                        {r.asset.reviewer?.name ?? "—"}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            r.status === "approved"
                              ? "status-active"
                              : r.status === "rejected"
                                ? "status-resigned"
                                : "status-pending"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {r.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 gap-1"
                              onClick={() =>
                                handleReviewTakeHome(r.id, "approved")
                              }
                            >
                              <Check className="w-3 h-3 text-success" />
                              <span className="text-xs">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 gap-1"
                              onClick={() =>
                                handleReviewTakeHome(r.id, "rejected")
                              }
                            >
                              <X className="w-3 h-3 text-destructive" />
                              <span className="text-xs">Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInboxDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

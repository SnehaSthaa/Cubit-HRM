import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { apiClient, AssetApi } from "@/services/apiClient";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { Asset, Employee } from "@/types";

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

type AssetStatus = "Assigned" | "Available" | "Under Maintenance" | "Retired";

type Condition = "Good" | "Fair" | "Needs Repair";

interface EmployeeApi {
  id: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  department?: string;
}

const normalizeStatus = (raw: string): AssetStatus => {
  const map: Record<string, AssetStatus> = {
    assigned: "Assigned",
    available: "Available",
    under_maintenance: "Under Maintenance",
    "under maintenance": "Under Maintenance",
    retired: "Retired",
  };
  return map[raw?.toLowerCase()] ?? (raw as AssetStatus);
};

const normalizeCondition = (raw?: string | null): Condition => {
  const map: Record<string, Condition> = {
    good: "Good",
    fair: "Fair",
    needs_repair: "Needs Repair",
    "needs repair": "Needs Repair",
  };
  return map[raw?.toLowerCase() ?? ""] ?? "Good";
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
  const [newAsset, setNewAsset] = useState({
    assetId: "",
    name: "",
    type: "",
    serialNumber: "",
    purchaseDate: "",
    condition: "Good" as Condition,
  });
  const [editAsset, setEditAsset] = useState({
    assetId: "",
    name: "",
    type: "",
    serialNumber: "",
    purchaseDate: "",
    condition: "Good" as Condition,
  });
  const [assignTo, setAssignTo] = useState("");

  const filtered = assets.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.assetId?.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      (a.assignedTo &&
        a.assignedTo.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });
  const openEditDialog = (asset: Asset) => {
    setEditAsset({
      assetId: asset.assetId || "",
      name: asset.name,
      type: asset.type,
      serialNumber: asset.serialNumber || "",
      purchaseDate: asset.purchaseDate || "",
      condition: asset.condition,
    });

    setEditDialog(asset);
  };

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
  function toDateStr(val: unknown): string {
    if (!val) return "";
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  }
  const mapAsset = (a: AssetApi): Asset => {
    console.log("RETURN DATE:", a.return_date);

    return {
      id: a.id,
      assetId: a.asset_id,
      name: a.name,
      type: a.type ?? a.category ?? "Other",
      serialNumber: a.serial_number,
      assigned_date: a.assigned_date,
      return_date: a.return_date,

      assignedTo: a.employee
        ? `${a.employee.first_name} ${a.employee.last_name}`
        : null,

      assignedToId: a.employee?.id ?? null,
      department: a.employee?.department ?? null,
      purchaseDate: a.purchase_date,
      status: normalizeStatus(a.status),
      condition: normalizeCondition(a.condition),
    };
  };

  const fetchAssets = async () => {
    try {
      const res = await apiClient.getAssets();

      const list = res.data ?? [];

      setAssets(list.map(mapAsset));
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
          // handle whichever field name your API returns
          name: e.fullName ?? e.full_name ?? e.name ?? e.id,
          department: e.department,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  const handleAddAsset = async () => {
    if (!newAsset.name || !newAsset.type) return;
    try {
      await apiClient.createAsset({
        asset_id: newAsset.assetId,
        name: newAsset.name,
        category: newAsset.type,
        serial_number: newAsset.serialNumber || null,
        purchase_date: newAsset.purchaseDate || null,
        status: "available",
        condition: newAsset.condition,
      });
      await fetchAssets();
      setNewAsset({
        assetId: "",
        name: "",
        type: "",
        serialNumber: "",
        purchaseDate: "",
        condition: "Good",
      });
      setAddDialog(false);
      toast({
        title: "Asset added",
        description: `${newAsset.name} added successfully.`,
      });
    } catch (err) {
      toast({ title: "Failed to add asset" });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await apiClient.deleteAsset(id);
      await fetchAssets();
      toast({ title: "Asset deleted" });
    } catch (err) {
      toast({ title: "Failed to delete asset" });
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
    } catch (err) {
      toast({ title: "Failed to assign asset" });
    }
  };
  const handleUpdateAsset = async () => {
    if (!editDialog) return;

    try {
      await apiClient.updateAsset(editDialog.id, {
        asset_id: editAsset.assetId,
        name: editAsset.name,
        category: editAsset.type,
        serial_number: editAsset.serialNumber || null,
        purchase_date: editAsset.purchaseDate || null,
        condition: editAsset.condition,
      });

      await fetchAssets();
      setEditDialog(null);

      toast({
        title: "Asset updated",
        description: `${editAsset.name} updated successfully.`,
      });
    } catch (err) {
      toast({ title: "Failed to update asset" });
    }
  };
  const handleApprove = (id: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Assigned" as AssetStatus } : a,
      ),
    );
    toast({ title: "Asset approved" });
  };

  const handleChangeStatus = (id: string, status: AssetStatus) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              ...(status === "Available"
                ? { assignedTo: null, assignedToId: null, department: null }
                : {}),
            }
          : a,
      ),
    );
    toast({ title: `Status changed to ${status}` });
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Asset Management</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage company assets
          </p>
        </div>
        {isHR && (
          <Dialog open={addDialog} onOpenChange={setAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 press-effect">
                <Plus className="w-3.5 h-3.5" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Asset ID*
                  </label>
                  <Input
                    value={newAsset.assetId}
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, assetId: e.target.value })
                    }
                    className="h-8 text-sm"
                    placeholder='e.g., MacBook Pro 16"'
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
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Condition
                    </label>
                    <Select
                      value={newAsset.condition}
                      onValueChange={(v) =>
                        setNewAsset({ ...newAsset, condition: v as Condition })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Good", "Fair", "Needs Repair"].map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
        )}
      </motion.div>

      {/* Summary Cards */}
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

      {/* Filters */}
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
          <Filter className="w-3.5 h-3.5" />
          Filters
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
      </motion.div>

      {/* Table */}
      <motion.div
        variants={item}
        className="bg-card border border-border rounded-lg overflow-hidden"
      >
        <table className="nexus-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Asset</th>
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
                  colSpan={8}
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
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {asset.department || "—"}
                    </td>
                    <td className="text-xs font-mono-data text-muted-foreground">
                      {toDateStr(asset.assigned_date) || "—"}
                    </td>
                    {asset.return_date ? (
                      <td className="text-xs font-mono-data text-muted-foreground">
                        {toDateStr(asset.return_date)}
                      </td>
                    ) : (
                      <td className="text-xs text-muted-foreground">
                        Not returned
                      </td>
                    )}

                    <td>
                      <span
                        className={`status-pill ${statusClass[asset.status as AssetStatus] ?? "status-pending"}`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {isHR && (
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
                            {asset.status === "Pending Approval" && (
                              <DropdownMenuItem
                                onClick={() => handleApprove(asset.id)}
                              >
                                Approve Request
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
                            <DropdownMenuItem
                              onClick={() => openEditDialog(asset)}
                            >
                              Edit Asset
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeStatus(asset.id, "Retired")
                              }
                            >
                              Retire Asset
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteAsset(asset.id)}
                            >
                              Delete Asset
                            </DropdownMenuItem>
                            {asset.status === "Under Maintenance" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeStatus(asset.id, "Available")
                                }
                              >
                                Mark as Available
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
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
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Asset ID
              </label>
              <Input
                value={editAsset.assetId}
                onChange={(e) =>
                  setEditAsset({ ...editAsset, assetId: e.target.value })
                }
                placeholder="Asset ID"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Asset Name
              </label>
              <Input
                value={editAsset.name}
                onChange={(e) =>
                  setEditAsset({ ...editAsset, name: e.target.value })
                }
                placeholder="Asset Name"
              />
            </div>

            <div></div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Serial Number
              </label>
              <Input
                value={editAsset.serialNumber}
                onChange={(e) =>
                  setEditAsset({ ...editAsset, serialNumber: e.target.value })
                }
                placeholder="Serial Number"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateAsset}>Update</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

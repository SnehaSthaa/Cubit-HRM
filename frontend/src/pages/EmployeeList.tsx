import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  X,
  Trash2,
  ArrowUp,
  ArrowUpDown,
  ArrowDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, EmployeeFormData } from "@/schemas/employee.schema";
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
import { apiClient, ApiResponse } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeesAction } from "@/permissions/permission";
import { Protected } from "@/components/common/ProtectedRoute";

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
type EmployeeStatus = "active" | "notice_period" | "resigned";

interface Employee {
  employee_id: string;
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  department: string;
  profile_image: string;
  position?: string;
  joining_date?: string;
  employment_status?: EmployeeStatus;
  phone?: string;
  type?: "Full-time" | "Contract" | "Part-time";
}

const statusClass: Record<EmployeeStatus, string> = {
  active: "active",
  notice_period: "notice_period",
  resigned: "resigned",
};
interface EmployeeAPI {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  profile_image?: string;
  position?: string;
  joining_date?: string;
  employment_status?: string;
}

const departments = [
  "Engineering",
  "Marketing",
  "HR",
  "Operations",
  "Finance",
  "Design",
  "Support",
];

const types = ["Full-time", "Contract", "Part-time"];

export default function EmployeeList() {
  const navigate = useNavigate();
  const { isHR } = useRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortEmployeeId, setSortEmployeeId] = useState<"asc" | "desc" | null>(
    null,
  );
  const [sortEmployeeName, setSortEmployeeName] = useState<
    "asc" | "desc" | null
  >(null);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
  });

  // Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await apiClient.getEmployees();

        const data = response.data ?? [];

        const normalizedEmployees: Employee[] = (data as EmployeeAPI[])
          .filter(
            (emp) =>
              emp.employment_status === "active" ||
              emp.employment_status === "notice_period",
          )
          .map((emp) => ({
            id: emp.id,
            employee_id: emp.employee_id,
            name: `${emp.first_name} ${emp.last_name}`.trim(),
            profile_image: emp.profile_image,
            email: emp.email,
            department: emp.department ?? "—",
            position: emp.position ?? "—",
            joining_date: emp.joining_date ?? "",
            phone: emp.phone ?? "",
            employment_status: emp.employment_status as EmployeeStatus,
          }));

        setEmployees(normalizedEmployees);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filtered = employees
    .filter((e) => {
      const q = search.toLowerCase();

      const matchSearch =
        e.name?.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q);
      const matchDept = filterDept === "all" || e.department === filterDept;
      const matchStatus =
        filterStatus === "all" || e.employment_status === filterStatus;
      const matchType =
        filterType === "all" || (e.type ?? "Full-time") === filterType;

      return matchSearch && matchDept && matchStatus && matchType;
    })
    .sort((a, b) => {
      if (sortEmployeeId) {
        const employeeIdA = a.employee_id.toLocaleLowerCase();
        const employeeIdB = b.employee_id.toLocaleLowerCase();
        return sortEmployeeId === "asc"
          ? employeeIdA.localeCompare(employeeIdB)
          : employeeIdB.localeCompare(employeeIdA);
      }
      if (sortEmployeeName) {
        const employeeNameA = a.name.toLocaleLowerCase();
        const employeeNameB = b.name.toLocaleLowerCase();
        return sortEmployeeName === "asc"
          ? employeeNameA.localeCompare(employeeNameB)
          : employeeNameB.localeCompare(employeeNameA);
      }
    });

  const hasFilters =
    filterDept !== "all" || filterStatus !== "all" || filterType !== "all";

  const handleAddEmployee = async (data: EmployeeFormData) => {
    const nameParts = data.full_name.trim().split(" ");
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(" ") || nameParts[0];

    try {
      const existingEmployees = await apiClient.getEmployees();
      const isDuplicate = existingEmployees.data?.some(
        (emp) => emp.employee_id === data.employee_id,
      );

      if (isDuplicate) {
        toast({
          title: "Error",
          description: `Employee ID "${data.employee_id}" is already in use.`,
          variant: "destructive",
        });
        return;
      }
      const employeeData: Record<string, unknown> = {
        first_name,
        last_name,
        email: data.email,
        department: data.department,
        joining_date: data.joining_date,
        employee_id: data.employee_id,
        position: data.position,
        date_of_birth: data.date_of_birth,
        employment_type: data.employment_type,
        employment_status: data.employment_status,
        phone: data.phone,
      };

      await apiClient.createEmployee(employeeData);

      const response = await apiClient.getEmployees();
      const refreshedData = Array.isArray(response.data)
        ? (response.data as unknown[])
        : [];
      const refreshedEmployees = refreshedData.map((emp) => {
        const record = emp as Record<string, unknown>;
        return {
          ...record,
          name:
            (record.name as string) ||
            `${(record.first_name as string) || ""} ${(record.last_name as string) || ""}`.trim(),
          joining_date: record.joining_date
            ? String(record.joining_date)
            : undefined,
          type: record.type as "Full-time" | "Contract" | "Part-time",
        } as Employee;
      });
      setEmployees(refreshedEmployees);
      reset();
      setAddDialog(false);
      toast({
        title: "Success",
        description: `${first_name} has been added.`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add employee";
      toast({
        title: "Error",
        description: errorMessage,
      });
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await apiClient.deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Success", description: "Employee removed" });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete employee";
      toast({
        title: "Error",
        description: errorMessage,
      });
    }
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
          <h1 className="text-lg font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono-data">{employees.length}</span> total
            employees
          </p>
        </div>
        <Protected allPermissions={[EmployeesAction.Create]}>
          <Dialog open={addDialog} onOpenChange={setAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 press-effect">
                <Plus className="w-3.5 h-3.5" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Employee ID *
                  </label>
                  <Input
                    {...register("employee_id")}
                    placeholder="EMP001"
                    className="h-9 text-sm"
                  />
                  {errors.employee_id && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.employee_id.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Full Name *
                  </label>
                  <Input
                    {...register("full_name")}
                    placeholder="Enter full name"
                    className="h-9 text-sm"
                  />
                  {errors.full_name && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Email *
                  </label>
                  <Input
                    {...register("email")}
                    placeholder="email@company.com"
                    type="email"
                    className="h-9 text-sm"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Phone *
                  </label>
                  <Input
                    {...register("phone")}
                    placeholder="98XXXXXXXX"
                    className="h-9 text-sm"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Date of Birth *
                  </label>
                  <Input
                    type="date"
                    {...register("date_of_birth")}
                    className="h-9 text-sm"
                  />
                  {errors.date_of_birth && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.date_of_birth.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Department *
                  </label>
                  <Select onValueChange={(v) => setValue("department", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.department.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Position *
                  </label>
                  <Input
                    {...register("position")}
                    placeholder="e.g., Sr. Developer"
                    className="h-9 text-sm"
                  />
                  {errors.position && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.position.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Employment Type *
                  </label>
                  <Select
                    onValueChange={(v) =>
                      setValue(
                        "employment_type",
                        v as "Full-time" | "Part-time" | "Contract-type",
                      )
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employment_type && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.employment_type.message}
                    </p>
                  )}
                </div>
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Date of Joining *
                  </label>
                  <Input
                    type="date"
                    {...register("joining_date")}
                    className="h-9 text-sm"
                  />
                  {errors.joining_date && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.joining_date.message}
                    </p>
                  )}
                </div>
              </div>{" "}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    reset();
                    setAddDialog(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit(handleAddEmployee)}>
                  Add Employee
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Protected>
      </motion.div>

      {/* Search + Filters */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, department…"
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
            {hasFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground gap-1"
              onClick={() => {
                setFilterDept("all");
                setFilterStatus("all");
                setFilterType("all");
              }}
            >
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-3 pb-1"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Department:</span>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Table */}
      <motion.div
        variants={item}
        className="bg-card border border-border rounded-lg overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Loading employees...</p>
          </div>
        ) : (
          <table className="nexus-table">
            <thead>
              <tr>
                <th>
                  <button
                    className=" flex gap-3"
                    onClick={() => {
                      setSortEmployeeName(null);
                      setSortEmployeeId((prev) =>
                        prev === "asc"
                          ? "desc"
                          : prev === "desc"
                            ? null
                            : "asc",
                      );
                    }}
                  >
                    ASSET ID
                    {sortEmployeeId === "asc" ? (
                      <ArrowUp className="w-5 h-5 text-primary" />
                    ) : sortEmployeeId === "desc" ? (
                      <ArrowDown className="w-5 h-5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-4 h-5 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th>
                  <button
                    className="flex gap-3"
                    onClick={() => {
                      setSortEmployeeId(null);
                      setSortEmployeeName((prev) =>
                        prev === "asc"
                          ? "desc"
                          : prev === "desc"
                            ? null
                            : "asc",
                      );
                    }}
                  >
                    EMPLOYEE
                    {sortEmployeeName === "asc" ? (
                      <ArrowUp className="w-5 h-5 text-primary" />
                    ) : sortEmployeeName === "desc" ? (
                      <ArrowDown className="w-5 h-5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-4 h-5 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th>Department</th>
                <th>Position</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="cursor-pointer">
                  <td className="font-mono-data text-xs text-muted-foreground">
                    {emp.employee_id}
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0 overflow-hidden">
                        {emp.profile_image ? (
                          <img
                            src={emp.profile_image}
                            alt={emp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (
                            emp.name ||
                            `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
                            "E"
                          )
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {emp.name ||
                            `${emp.first_name || ""} ${emp.last_name || ""}`.trim()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm">{emp.department || "—"}</td>
                  <td className="text-sm text-muted-foreground">
                    {emp.position || "—"}
                  </td>
                  <td className="text-sm text-muted-foreground">{emp.email}</td>
                  <td className="font-mono-data text-xs text-muted-foreground">
                    {emp.phone || "__"}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${statusClass[emp.employment_status ?? "active"]}`}
                    >
                      {emp.employment_status?.replace("_", " ") || "active"}
                    </span>
                  </td>
                  <Protected
                    anyPermissions={[
                      EmployeesAction.Edit,
                      EmployeesAction.Delete,
                    ]}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => navigate(`/employees/${emp.id}`)}
                          >
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem>View Documents</DropdownMenuItem>
                          <DropdownMenuItem>View Attendance</DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteEmployee(emp.id)}
                          >
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </Protected>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>
    </motion.div>
  );
}

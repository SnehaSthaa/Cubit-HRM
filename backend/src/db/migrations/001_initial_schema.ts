import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Users table
  if (!(await knex.schema.hasTable("users"))) {
    await knex.schema.createTable("users", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("email").unique().notNullable();
      table.string("password_hash").notNullable();
      table.string("name").notNullable();
      table.string("phone");
      table.enum("role", ["super_admin", "hr_admin", "employee"]).notNullable();
      table.boolean("is_active").defaultTo(true);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Employees table
  if (!(await knex.schema.hasTable("employees"))) {
    await knex.schema.createTable("employees", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
      table.string("employee_id").unique().notNullable();
      table.string("first_name").notNullable();
      table.string("last_name").notNullable();
      table.date("date_of_birth");
      table.string("gender");
      table.string("phone");
      table.string("email").unique().notNullable();
      table.string("department").notNullable();
      table.string("position").notNullable();
      table.date("joining_date").notNullable();
      table.decimal("salary", 12, 2);
      table.string("manager_id");
      table.string("address");
      table.string("city");
      table.string("state");
      table.string("postal_code");
      table.text("notes");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Attendance table
  if (!(await knex.schema.hasTable("attendance"))) {
    await knex.schema.createTable("attendance", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("employee_id").references("id").inTable("employees").onDelete("CASCADE");
      table.date("date").notNullable();
      table.time("check_in");
      table.time("check_out");
      table.enum("status", ["present", "absent", "late", "half_day", "on_leave"]).notNullable();
      table.text("notes");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["employee_id", "date"]);
    });
  }

  // Leave table
  if (!(await knex.schema.hasTable("leaves"))) {
    await knex.schema.createTable("leaves", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("employee_id").references("id").inTable("employees").onDelete("CASCADE");
      table.date("start_date").notNullable();
      table.date("end_date").notNullable();
      table.enum("leave_type", ["sick", "personal", "vacation", "maternity", "casual"]).notNullable();
      table.integer("days_count").notNullable();
      table.text("reason");
      table.enum("status", ["pending", "approved", "rejected"]).defaultTo("pending");
      table.uuid("approved_by");
      table.text("approval_notes");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Payroll table
  if (!(await knex.schema.hasTable("payroll"))) {
    await knex.schema.createTable("payroll", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("employee_id").references("id").inTable("employees").onDelete("CASCADE");
      table.integer("month").notNullable();
      table.integer("year").notNullable();
      table.decimal("base_salary", 12, 2).notNullable();
      table.decimal("bonus", 12, 2).defaultTo(0);
      table.decimal("deductions", 12, 2).defaultTo(0);
      table.decimal("net_salary", 12, 2).notNullable();
      table.enum("status", ["pending", "processed", "paid"]).defaultTo("pending");
      table.timestamp("paid_date");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["employee_id", "month", "year"]);
    });
  }

  // Assets table
  if (!(await knex.schema.hasTable("assets"))) {
    await knex.schema.createTable("assets", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("asset_id").unique().notNullable();
      table.string("name").notNullable();
      table.string("category").notNullable();
      table.string("serial_number").unique();
      table.decimal("purchase_cost", 12, 2);
      table.date("purchase_date");
      table.enum("status", ["available", "assigned", "maintenance", "retired"]).defaultTo("available");
      table.uuid("assigned_to");
      table.date("assigned_date");
      table.string("location");
      table.text("notes");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Reports table
  if (!(await knex.schema.hasTable("reports"))) {
    await knex.schema.createTable("reports", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("generated_by").references("id").inTable("users");
      table.string("name").notNullable();
      table.enum("type", ["attendance", "payroll", "leave", "performance"]).notNullable();
      table.date("from_date");
      table.date("to_date");
      table.json("filters");
      table.json("data");
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order of creation
  const tables = [
    "reports",
    "assets",
    "payroll",
    "leaves",
    "attendance",
    "employees",
    "users",
  ];

  for (const table of tables) {
    if (await knex.schema.hasTable(table)) {
      await knex.schema.dropTable(table);
    }
  }
}

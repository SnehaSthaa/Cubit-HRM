import { Knex } from "knex";
import bcrypt from "bcrypt";

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex("users").del();

  // Hash passwords
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Insert seed data
  await knex("users").insert([
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "admin@cubit.io",
      password_hash: hashedPassword,
      name: "Super Admin",
      phone: "+1234567890",
      role: "super_admin",
      is_active: true,
    },
    {
      id: "223e4567-e89b-12d3-a456-426614174000",
      email: "hr@cubit.io",
      password_hash: hashedPassword,
      name: "HR Admin",
      phone: "+1234567891",
      role: "hr_admin",
      is_active: true,
    },
    {
      id: "323e4567-e89b-12d3-a456-426614174000",
      email: "aarav@cubit.io",
      password_hash: hashedPassword,
      name: "Aarav Patel",
      phone: "+1234567892",
      role: "employee",
      is_active: true,
    },
  ]);
}

import { allPermission } from "@/permissions/allowed-permission";
import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  //get existing permissions
  const existingPermissions = await knex("permissions").select();

  if (existingPermissions.length > 0) {
    console.log("Permissions already seeded, skipping...");
    return;
  }

  //seedable permisssion
  //insert many
  const columns = [
    {
      role: "super_admin",
      permission: allPermission["super_admin"],
    },
    [
      {
        role: "hr_admin",
        permission: allPermission["hr_admin"],
      },
    ],
    [
      {
        role: "employee",
        permission: allPermission["employee"],
      },
    ],
  ];
}

import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";

const zk = new ZKLib("192.168.110.64", 4370, 10000, 4000);

async function main() {
  // 1. Get device users
  try {
    await zk.createSocket();
    const users = await zk.getUsers();
    console.log("\n=== DEVICE USERS ===");
    users.data.forEach((u: any) => {
      console.log(`UID: ${u.uid} | UserID: ${u.userId} | Name: ${u.name}`);
    });
    await zk.disconnect();
  } catch (err: any) {
    console.error("Device error:", err.message);
  }

  // 2. Get DB employees
  const employees = await prisma.employee.findMany({
    include: { personal_details: true },
  });

  console.log("\n=== DB EMPLOYEES ===");
  employees.forEach((e) => {
    const pd = e.personal_details;
    const name = pd ? `${pd.first_name} ${pd.last_name}` : "No name";
    console.log(`ID: ${e.id} | Name: ${name}`);
  });

  await prisma.$disconnect();
}

main();

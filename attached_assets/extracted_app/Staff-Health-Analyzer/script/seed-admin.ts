
import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding admin user...");
  
  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  
  if (existingAdmin.length === 0) {
    const hashedPassword = await hashPassword("123456");
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      role: "admin",
    });
    console.log("Admin user created: admin / 123456");
  } else {
    console.log("Admin user already exists.");
  }
}

seed().catch(console.error).finally(() => process.exit());

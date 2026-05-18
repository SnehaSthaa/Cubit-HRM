import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { JwtPayload } from "../types/index.js";

export class AuthService {
  static async register(email: string, password: string, name: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        name,
        role: "employee",
      },
    });

    const token = await this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  static async login(email: string, password: string) {
    const cleanEmail = email.trim();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) throw new Error("Invalid credentials");

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) throw new Error("Invalid credentials");
    if (!user.is_active) throw new Error("User account is inactive");

    const token = await this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  // Now async — looks up the Employee row to get its UUID for the token
  static async generateToken(user: any): Promise<string> {
    // Look up the employee record linked to this user
    const employee = await prisma.employee.findUnique({
      where: { user_id: user.id },
      select: { id: true },
    });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      // Will be undefined for super_admin/hr_admin who have no employee row
      employeeId: employee?.id,
    };

    const secret =
      process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";

    return jwt.sign(payload, secret, {
      expiresIn: (process.env.JWT_EXPIRE as any) || "7d",
    });
  }

  static sanitizeUser(user: any) {
    const { password_hash, ...cleanUser } = user;
    return {
      ...cleanUser,
      phone: cleanUser.phone || null,
    };
  }
}

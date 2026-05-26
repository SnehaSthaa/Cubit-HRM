import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { JwtPayload, UserRole } from "../types/index.js";

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
        role: ["employee"],
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

  static generateToken(user: any, activeRole?: string): string {
    const roles = Array.isArray(user.role) ? user.role : [user.role];
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: roles,
      activeRole: (activeRole ?? roles[0]) as UserRole,
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

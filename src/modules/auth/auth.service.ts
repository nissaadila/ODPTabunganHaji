import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../library/prisma";
import { LoginInput, SetPasswordInput } from "./auth.schema";

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = "24h";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email atau password salah");
    this.name = "InvalidCredentialsError";
  }
}

export class PasswordNotSetError extends Error {
  constructor() {
    super("Password belum diatur. Silakan set password terlebih dahulu");
    this.name = "PasswordNotSetError";
  }
}

export class NasabahNotFoundError extends Error {
  constructor() {
    super("Nasabah tidak ditemukan");
    this.name = "NasabahNotFoundError";
  }
}

export class PasswordAlreadySetError extends Error {
  constructor() {
    super("Password sudah diatur. Gunakan endpoint ubah password");
    this.name = "PasswordAlreadySetError";
  }
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET belum diset di environment");
  return secret;
};

export const authService = {
  async setPassword(data: SetPasswordInput) {
    const nasabah = await prisma.nasabah.findUnique({
      where: { email: data.email },
    });
    if (!nasabah || nasabah.nik !== data.nik) {
      throw new NasabahNotFoundError();
    }
    if (nasabah.passwordHash) {
      throw new PasswordAlreadySetError();
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    await prisma.nasabah.update({
      where: { id: nasabah.id },
      data: { passwordHash },
    });
    return { id: nasabah.id, email: nasabah.email };
  },

  async login(data: LoginInput) {
    const nasabah = await prisma.nasabah.findUnique({
      where: { email: data.email },
    });
    if (!nasabah) throw new InvalidCredentialsError();
    if (!nasabah.passwordHash) throw new PasswordNotSetError();

    const ok = await bcrypt.compare(data.password, nasabah.passwordHash);
    if (!ok) throw new InvalidCredentialsError();

    const jti = randomUUID();
    const options: SignOptions = { expiresIn: TOKEN_TTL, jwtid: jti };
    const token = jwt.sign(
      { sub: nasabah.id, email: nasabah.email },
      getJwtSecret(),
      options,
    );

    return {
      token,
      expiresIn: TOKEN_TTL,
      nasabah: {
        id: nasabah.id,
        nama: nasabah.nama,
        email: nasabah.email,
      },
    };
  },

  async logout(params: { jti: string; exp: number }) {
    await prisma.revokedToken.upsert({
      where: { jti: params.jti },
      update: {},
      create: {
        jti: params.jti,
        expiresAt: new Date(params.exp * 1000),
      },
    });
  },
};

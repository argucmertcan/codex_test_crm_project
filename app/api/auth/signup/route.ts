import bcrypt from "bcryptjs";

import { credentialsSignUpSchema } from "@/lib/validations/auth";
import { ApiError, createErrorResponse } from "@/server/api/errors";
import { success } from "@/server/api/http";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { userRepository } from "@/server/db/repositories/user.repository";

const HASH_ROUNDS = 12;

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth:signup");

    const body = await request.json();
    const parsed = credentialsSignUpSchema.parse(body);
    const normalizedEmail = parsed.email.toLowerCase();

    const existing = await userRepository.findByEmail(normalizedEmail, { includeDeleted: true });
    if (existing) {
      throw new ApiError("EMAIL_IN_USE", "An account with this email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.password, HASH_ROUNDS);

    const user = await userRepository.create({
      name: parsed.name,
      email: normalizedEmail,
      passwordHash,
      roles: ["editor"],
      status: "active"
    });

    return success(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error);
    }
    return createErrorResponse(new Error("Unknown error"));
  }
}

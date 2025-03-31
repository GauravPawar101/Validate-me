import type { Request, Response, NextFunction } from "express";
import { prismaClient } from "db";
import { getAuth, clerkClient } from "@clerk/express";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // Extract authentication from Clerk
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized: No valid user session" });
        }

        // Fetch user details from Clerk
        const clerkUser = await clerkClient.users.getUser(userId);

        if (!clerkUser) {
            return res.status(401).json({ error: "Unauthorized: Clerk user not found" });
        }

        // Extract user details
        const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : "New User";
        const email = clerkUser.emailAddresses?.[0]?.emailAddress || `${userId}@example.com`;

        // Upsert user into Prisma database
        const user = await prismaClient.user.upsert({
            where: { id: userId }, // Unique identifier from Clerk
            update: {
                lastLogin: new Date(),
                name,
                email
            },
            create: {
                id: userId,
                name,
                email,
                hours: 0,
                total: 1501.23,
                days: { create: [] },
                websites: { create: [] }
            }
        });

        // Attach user info to request object
        (req as any).userId = user.id;
        (req as any).user = user;

        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

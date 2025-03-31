import express, { Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express";
import { prismaClient } from "db";
import cors from "cors";
import { authMiddleware } from "./middleWare";
import axios from 'axios';

require('dotenv').config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(clerkMiddleware());
app.use(authMiddleware);

const PORT = process.env.PORT || 8085;

// Middleware to verify website access
const websiteAccessMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const websiteId = req.body.websiteId || req.params.websiteId || req.query.websiteId;
    
    if (!websiteId) {
      return res.status(400).json({ error: "Website ID is required" });
    }
    
    const website = await prismaClient.website.findFirst({
      where: { 
        id: websiteId, 
        userId,
        disabled: false
      }
    });
    
    if (!website) {
      return res.status(404).json({ error: "Website not found or access denied" });
    }
    
    (req as any).website = website;
    next();
  } catch (error) {
    console.error("Error in website access middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get the default validator or create one if none exists
const getDefaultValidator = async (req: Request) => {
  // Get the client's IP address
  const ip = req.headers['x-forwarded-for'] || 
             req.socket.remoteAddress || 
             '127.0.0.1';
  
  const ipAddress = Array.isArray(ip) ? ip[0] : ip as string;
  
  // Try to find an existing validator with this IP
  let validator = await prismaClient.validator.findFirst({
    where: { 
      ip: ipAddress,
      status: 'online'
    }
  });
  
  if (!validator) {
    // If no validator exists with this IP, check for any online validator
    validator = await prismaClient.validator.findFirst({
      where: { status: 'online' }
    });
    
    if (!validator) {
      // Create a new validator if none exists
      validator = await prismaClient.validator.create({
        data: {
          publicKey: 'validator-' + Date.now(),
          ip: ipAddress,
          location: req.headers['x-forwarded-for'] ? 'remote' : 'local',
          version: '1.0.0'
        }
      });
    }
  }
  
  return validator;
};

// Validation route with proper middleware
app.post('/api/v1/validate', websiteAccessMiddleware, async (req: Request, res: Response) => {
    const { url } = req.body;
    const website = (req as any).website;
    
    if (!url) {
      return res.status(400).json({ 
        status: 'bad', 
        message: 'URL is required' 
      });
    }
    
    try {
      const validator = await getDefaultValidator(req);
      const startTime = Date.now();
      
      // Add timeout to prevent long-running requests
      const response = await axios.get(url, { 
        timeout: 10000,
        validateStatus: false // Don't throw errors for non-2xx responses
      });
      
      const endTime = Date.now();
      const latency = (endTime - startTime) / 1000; // Convert to seconds
      
      // Check if response is successful (2xx status code)
      if (response.status >= 200 && response.status < 300) {
        // Create a new websiteTick entry in the database
        const newTick = await prismaClient.websiteTick.create({
          data: {
            websiteId: website.id,
            validatorId: validator.id,
            status: 'good',
            latency: latency,
            details: {
              responseCode: response.status,
              message: `Response code: ${response.status}`,
              validatorIp: validator.ip
            }
          }
        });
        
        // Update website status
        await prismaClient.website.update({
          where: { id: website.id },
          data: {
            status: 'good',
            lastChecked: new Date()
          }
        });
        
        // Update validator stats
        await prismaClient.validator.update({
          where: { id: validator.id },
          data: {
            lastSeen: new Date(),
            totalValidations: { increment: 1 }
          }
        });
        
        return res.json({
          status: 'good',
          message: `Site is up. Response code: ${response.status}`,
          tick: newTick,
          validator: {
            id: validator.id,
            ip: validator.ip
          }
        });
      } else {
        // Create a fail tick
        const newTick = await prismaClient.websiteTick.create({
          data: {
            websiteId: website.id,
            validatorId: validator.id,
            status: 'bad',
            latency: latency,
            details: {
              responseCode: response.status,
              message: `Bad response code: ${response.status}`,
              validatorIp: validator.ip
            }
          }
        });
        
        // Update website status
        await prismaClient.website.update({
          where: { id: website.id },
          data: {
            status: 'bad',
            lastChecked: new Date()
          }
        });
        
        // Update validator stats
        await prismaClient.validator.update({
          where: { id: validator.id },
          data: {
            lastSeen: new Date(),
            totalValidations: { increment: 1 }
          }
        });
        
        return res.json({
          status: 'bad',
          message: `Site returned error code: ${response.status}`,
          tick: newTick,
          validator: {
            id: validator.id,
            ip: validator.ip
          }
        });
      }
    } catch (error: any) {
      // Handle network errors, timeouts, etc.
      const errorMessage = error.code === 'ECONNABORTED' 
        ? 'Request timed out' 
        : error.message;
      
      const validator = await getDefaultValidator(req);
      
      // Create a fail tick
      const newTick = await prismaClient.websiteTick.create({
        data: {
          websiteId: website.id,
          validatorId: validator.id,
          status: 'bad',
          latency: 0, // No latency for failed requests
          details: {
            error: errorMessage,
            code: error.code || 'UNKNOWN_ERROR',
            validatorIp: validator.ip
          }
        }
      });
      
      // Update website status
      await prismaClient.website.update({
        where: { id: website.id },
        data: {
          status: 'bad',
          lastChecked: new Date()
        }
      });
      
      // Update validator stats
      await prismaClient.validator.update({
        where: { id: validator.id },
        data: {
          lastSeen: new Date(),
          totalValidations: { increment: 1 }
        }
      });
      
      return res.json({
        status: 'bad',
        message: errorMessage,
        tick: newTick,
        validator: {
          id: validator.id,
          ip: validator.ip
        }
      });
    }
});

app.delete("/api/v1/website/:websiteId", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { websiteId } = req.params;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!websiteId) return res.status(400).json({ error: "Website ID is required" });

        const website = await prismaClient.website.findFirst({ where: { id: websiteId, userId } });

        if (!website) return res.status(404).json({ error: "Website not found" });

        // Instead of deleting, mark as disabled (soft delete)
        await prismaClient.website.update({
            where: { id: websiteId },
            data: { disabled: true },
        });

        res.json({ message: "Website deleted (disabled)" });
    } catch (error) {
        console.error("Error deleting website:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.post("/api/v1/website", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { url } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!url) return res.status(400).json({ error: "URL is required" });

        const existingWebsite = await prismaClient.website.findUnique({ where: { url } });

        if (existingWebsite) return res.status(400).json({ error: "Website already exists" });

        const data = await prismaClient.website.create({ data: { userId, url } });

        res.status(201).json(data);
    } catch (error: any) {
        console.error("Error creating website:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/v1/website/status", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const websiteId = req.query.websiteId as string;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!websiteId) return res.status(400).json({ error: "Website ID is required" });

        const data = await prismaClient.website.findFirst({
            where: { id: websiteId, userId, disabled: false },
            include: { ticks: true },
        });

        if (!data) return res.status(404).json({ error: "Website not found or disabled." });

        res.json(data);
    } catch (error) {
        console.error("Error fetching website status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/v1/earnings/total", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const user = await prismaClient.user.findUnique({ where: { id: userId }, select: { total: true } });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ total: user.total ?? 0 });
    } catch (error) {
        console.error("Error fetching total earnings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/v1/hours", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: { hours: true, monthly: true, total: true },
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            hours: user.hours ?? 0,
            earnings: user.monthly ?? 0,
            total: user.total ?? 0,
        });
    } catch (error) {
        console.error("Error fetching user hours:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/v1/earnings/daily", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthlyEarnings = await prismaClient.days.findMany({
            where: { userId, date: { gte: monthStart } },
            select: { hours: true },
        });

        const hourlyRate = 10;
        const totalHours = monthlyEarnings.reduce((sum, day) => sum + day.hours, 0);
        const earnings = totalHours * hourlyRate;

        res.json({ monthly: earnings });
    } catch (error) {
        console.error("Cannot fetch your wage", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/api/v1/amt", async (req, res) => {
  try {
    const userId = req.userId; // Make sure you have middleware that attaches userId to req object
    const { amt } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!amt || amt <= 0) return res.status(400).json({ error: "Invalid amt input" });

    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { monthly: true, total: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const { total } = user;

    if (amt > total) return res.status(400).json({ error: "Insufficient balance for withdrawal" });

    const updatedTotal = total - amt;

    await prismaClient.user.update({
      where: { id: userId },
      data: { total: updatedTotal },
    });

    res.json({ updatedTotal });
  } catch (error) {
    console.error("Error updating total:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/v1/hours", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { hours } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!hours || hours <= 0) return res.status(400).json({ error: "Invalid hours input" });

        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: { hours: true, monthly: true, total: true },
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        const EARNING_RATE_PER_HOUR = 100;
        const earnings = hours * EARNING_RATE_PER_HOUR;
        const updatedHours = user.hours + hours;
        const updatedSessionEarnings = (user.monthly ?? 0) + earnings;
        const updatedTotal = (user.total ?? 0) + earnings;

        await prismaClient.user.update({
            where: { id: userId },
            data: { hours: updatedHours, monthly: updatedSessionEarnings, total: updatedTotal },
        });

        res.json({ updatedHours, updatedSessionEarnings, updatedTotal });
    } catch (error) {
        console.error("Error updating hours:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/v1/websites", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const websites = await prismaClient.website.findMany({ where: { userId } });

        res.json({ websites });
    } catch (error) {
        console.error("Error fetching websites:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
});
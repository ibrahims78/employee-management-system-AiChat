import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

async function validateApiKey(req: Request, res: Response, machineOnly = false): Promise<boolean> {
  // Accept key from header OR from URL query param ?t= or ?_t= (legacy) (for n8n tool calls where headers are LLM-controlled)
  const apiKey = req.headers["x-api-key"] ?? req.query.t ?? req.query._t;

  if (!apiKey || typeof apiKey !== "string") {
    res.status(401).json({
      error: "MISSING_API_KEY",
      message: "مفتاح API مطلوب. يرجى إضافة الهيدر: x-api-key",
    });
    return false;
  }

  try {
    const key = await storage.getApiKeyByValue(apiKey);

    if (!key) {
      res.status(401).json({
        error: "INVALID_API_KEY",
        message: "مفتاح API غير صالح أو غير موجود في النظام.",
      });
      return false;
    }

    if (!key.isActive) {
      res.status(401).json({
        error: "API_KEY_DISABLED",
        message: "مفتاح API معطّل. يرجى التواصل مع مسؤول النظام لتفعيله.",
      });
      return false;
    }

    if (key.expiryDate && new Date() > new Date(key.expiryDate)) {
      res.status(401).json({
        error: "API_KEY_EXPIRED",
        message: `انتهت صلاحية مفتاح API بتاريخ: ${new Date(key.expiryDate).toLocaleDateString("ar-SY")}`,
      });
      return false;
    }

    if (machineOnly && key.keyType !== "machine") {
      res.status(403).json({
        error: "MACHINE_KEY_REQUIRED",
        message: "هذا المسار يتطلب مفتاح آلة (machine) حصرياً.",
      });
      return false;
    }

    return true;
  } catch (err) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "حدث خطأ أثناء التحقق من مفتاح API. يرجى المحاولة لاحقاً.",
    });
    return false;
  }
}

export async function authenticateAPI(req: Request, res: Response, next: NextFunction) {
  const valid = await validateApiKey(req, res, false);
  if (valid) next();
}

export async function authenticateMachineAPI(req: Request, res: Response, next: NextFunction) {
  const valid = await validateApiKey(req, res, true);
  if (valid) next();
}

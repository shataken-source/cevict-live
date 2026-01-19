import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
});

export default rateLimiter;

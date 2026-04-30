import { AppError } from "../utils/appError.js";
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log(err);
  const error = { ...err };
  error.message = err.message;
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    status: err.status || "error",
    message: err.message || "Internal Server Error",
  });
};

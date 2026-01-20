/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../../generated/prisma/client.js";


// // Sanitize error to prevent exposing sensitive information in production
// const sanitizeError = (error: any) => {
//   // Don't expose Prisma errors in production
//   if (ENV.NODE_ENV === "production" && error.code?.startsWith("P")) {
//     return {
//       message: "Database operation failed",
//       errorDetails: null,
//     };
//   }
//   return error;
// };

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode: number = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  const success = false;
  let message = err.message || "Something went wrong!";
  let error = err;

  if (err instanceof ZodError) {
    message = "Validation Error";
    error = err.issues.map((issue: any) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    statusCode = httpStatus.BAD_REQUEST;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      message = "Duplicate key error";
      error = err.meta;
      statusCode = httpStatus.CONFLICT;
    }
    if (err.code === "P1000") {
      message = "Authentication failed against database server";
      error = err.meta;
      statusCode = httpStatus.BAD_GATEWAY;
    }
    if (err.code === "P2003") {
      message = "Foreign key constraint failed";
      error = err.meta;
      statusCode = httpStatus.BAD_REQUEST;
    }
    if (err.code === "P2025") {
      message = "Record not found";
      error = err.meta;
      statusCode = httpStatus.NOT_FOUND;
    }
    if (err.code === "P2000") {
      message = "Value too long for column";
      error = err.meta;
      statusCode = httpStatus.BAD_REQUEST;
    }
    if (err.code === "P2001") {
      message = "Record does not exist";
      error = err.meta;
      statusCode = httpStatus.NOT_FOUND;
    }
    if (err.code === "P2005") {
      message = "Invalid value for field";
      error = err.meta;
      statusCode = httpStatus.BAD_REQUEST;
    }
    if (err.code === "P2006") {
      message = "Invalid value provided";
      error = err.meta;
      statusCode = httpStatus.BAD_REQUEST;
    }
    if (err.code === "P2011") {
      message = "Null constraint violation";
      error = err.meta;
      statusCode = httpStatus.BAD_REQUEST;
    }
    if (err.code === "P2014") {
      message = "Relation violation";
      error = err.meta;
      statusCode = httpStatus.BAD_REQUEST;
    }
    if (err.code === "P2015") {
      message = "Related record not found";
      error = err.meta;
      statusCode = httpStatus.NOT_FOUND;
    }
    if (err.code === "P2016") {
      message = "Query interpretation error";
      error = err.meta;
      statusCode = httpStatus.BAD_REQUEST;
    }
    if (err.code === "P2021") {
      message = "Table does not exist";
      error = err.meta;
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    }
    if (err.code === "P2022") {
      message = "Column does not exist";
      error = err.meta;
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    message = "Validation Error";
    error = err.message;
    statusCode = httpStatus.BAD_REQUEST;
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    message = "Unknown Prisma error occured!";
    error = err.message;
    statusCode = httpStatus.BAD_REQUEST;
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    message = "Prisma client failed to initialize!";
    error = err.message;
    statusCode = httpStatus.BAD_REQUEST;
  }
  // // Sanitize error before sending response
  // const sanitizedError = sanitizeError(error);

  res.status(statusCode).json({
    success,
    message,
    error: error,
  });
};

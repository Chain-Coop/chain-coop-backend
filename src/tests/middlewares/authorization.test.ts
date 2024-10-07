import { Request, Response, NextFunction } from "express";
import { authorize, authorizePermissions } from "../../middlewares/authorization";
import { ForbiddenError, UnauthenticatedError } from "../../errors";
import jwt from "jsonwebtoken";

// Mock necessary components
jest.mock("jsonwebtoken");

describe("Authorization Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {} // Initialize headers as an empty object
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe("authorize", () => {
    it("should throw UnauthenticatedError if authorization header is missing", () => {
      expect(() => authorize(mockRequest as Request, mockResponse as Response, nextFunction))
        .toThrow(UnauthenticatedError);
    });

    it("should throw UnauthenticatedError if token is invalid", () => {
      mockRequest.headers = { authorization: "Bearer invalidToken" };
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error(); });

      expect(() => authorize(mockRequest as Request, mockResponse as Response, nextFunction))
        .toThrow(UnauthenticatedError);
    });

    it("should call next if token is valid", () => {
      mockRequest.headers = { authorization: "Bearer validToken" };
      (jwt.verify as jest.Mock).mockReturnValue({
        user: { email: "test@example.com", userId: "1", role: "user" }
      });

      authorize(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual({
        email: "test@example.com",
        userId: "1",
        role: "user"
      });
    });
  });

  describe("authorizePermissions", () => {
    it("should throw ForbiddenError if user role is not allowed", () => {
      // Casting mockRequest to `any` to avoid TypeScript error
      (mockRequest as any).user = { role: "user" }; // Unauthorized role

      const middleware = authorizePermissions("admin", "manager");

      expect(() => middleware(mockRequest as any, mockResponse as Response, nextFunction))
        .toThrow(ForbiddenError);
    });

    it("should call next if user role is allowed", () => {
      // Casting mockRequest to `any` to avoid TypeScript error
      (mockRequest as any).user = { role: "admin" }; // Authorized role

      const middleware = authorizePermissions("admin", "manager");

      middleware(mockRequest as any, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});

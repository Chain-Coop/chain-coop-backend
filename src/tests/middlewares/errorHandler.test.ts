import { Request, Response, NextFunction } from "express";
import { errorHandlerMiddleware } from "../../middlewares/errorHandler";
import { StatusCodes } from "http-status-codes";

describe("Error Handler Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    jsonMock = jest.fn();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jsonMock,
    };
    nextFunction = jest.fn();
  });

  it("should return 500 for a generic error", () => {
    const error = new Error("Generic Error");

    errorHandlerMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(
      StatusCodes.INTERNAL_SERVER_ERROR
    );
    expect(jsonMock).toHaveBeenCalledWith({
      msg: "Generic Error",
    });
  });

  it("should handle validation errors", () => {
    const error = {
      name: "ValidationError",
      errors: {
        name: { message: "Name is required" },
        email: { message: "Email is invalid" },
      },
    };

    errorHandlerMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      msg: "Name is required,Email is invalid",
    });
  });

  it("should handle duplicate key errors", () => {
    const error = {
      code: 11000,
      keyValue: { email: "test@example.com" },
    };

    errorHandlerMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      msg: "Duplicate value entered for email field, please choose another value",
    });
  });

  it("should handle cast errors", () => {
    const error = {
      name: "CastError",
      value: "invalid-id",
    };

    errorHandlerMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith({
      msg: "No item found with id : invalid-id",
    });
  });
});

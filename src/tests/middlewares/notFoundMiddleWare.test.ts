import { notFound } from "../../middlewares/notFoundMiddleWare";
import { Request, Response } from "express";

describe("Not Found Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ send: sendMock });
    mockResponse = {
      status: statusMock,
    };
  });

  it("should return 404 status and 'Route does not exist' message", () => {
    notFound({ req: mockRequest, res: mockResponse });

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(sendMock).toHaveBeenCalledWith("Route does not exist");
  });
});

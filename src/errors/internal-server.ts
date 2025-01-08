// errors/internal-server.ts
import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./custom-api";

export class InternalServerError extends CustomAPIError {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }
}

export default InternalServerError;

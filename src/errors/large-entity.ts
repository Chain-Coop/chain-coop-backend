import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./custom-api";

export class EntityTooLarge extends CustomAPIError {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.REQUEST_TOO_LONG;
  }
}

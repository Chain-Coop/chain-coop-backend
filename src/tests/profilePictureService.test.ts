import { Request } from "express"; // Import the Request type
import { uploadProfilePicture, deleteProfilePicture } from "../services/profilePictureService"; // Adjust the path as necessary
import cloudinary from "cloudinary";
import fs from "fs";
import { BadRequestError, EntityTooLarge } from "../errors"; // Adjust the path as necessary

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

jest.mock("fs", () => ({
  unlinkSync: jest.fn(),
}));

describe("Profile Picture Service", () => {
  const mockFile = {
    tempFilePath: "temp/path/to/profile.jpg",
    size: 1024 * 1024 * 4, // 4MB
  };

  const mockRequest = {
    files: {
      profilePicture: mockFile,
    },
  } as unknown as Request; // Cast to Request type

  const userId = "user_12345";

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  describe("uploadProfilePicture", () => {
    it("should upload a profile picture and return the uploaded file details", async () => {
      const mockUploadResponse = {
        public_id: "some_public_id",
        secure_url: "https://cloudinary.com/some_secure_url",
      };

      (cloudinary.v2.uploader.upload as jest.Mock).mockResolvedValue(mockUploadResponse);

      const result = await uploadProfilePicture(mockRequest, userId);

      expect(result).toEqual(mockUploadResponse); // Validate the returned upload response
      expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(mockFile.tempFilePath, expect.any(Object)); // Check upload parameters
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.tempFilePath); // Ensure temp file is deleted
    });

    it("should throw a BadRequestError if no file is provided", async () => {
      const requestWithoutFile = { files: {} } as unknown as Request; // Cast to Request type

      await expect(uploadProfilePicture(requestWithoutFile, userId)).rejects.toThrow(BadRequestError);
      await expect(uploadProfilePicture(requestWithoutFile, userId)).rejects.toThrow("Please upload a profile picture");
    });

    it("should throw an EntityTooLarge error if file size exceeds the limit", async () => {
      mockFile.size = 1024 * 1024 * 6; // 6MB
      const requestWithLargeFile = { files: { profilePicture: mockFile } } as unknown as Request; // Cast to Request type

      await expect(uploadProfilePicture(requestWithLargeFile, userId)).rejects.toThrow(EntityTooLarge);
      await expect(uploadProfilePicture(requestWithLargeFile, userId)).rejects.toThrow("Max size of 5MB exceeded");
    });
  });

  describe("deleteProfilePicture", () => {
    it("should call Cloudinary destroy method with the correct public ID", async () => {
      const publicId = "some_public_id";

      await deleteProfilePicture(publicId);

      expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith(publicId); // Ensure destroy was called with the correct public ID
    });
  });
});

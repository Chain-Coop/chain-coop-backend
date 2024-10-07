import uploadImageFile from '../../utils/imageUploader';
import cloudinary from 'cloudinary';
import fs from 'fs';
import { BadRequestError, EntityTooLarge } from '../../errors';

jest.mock('cloudinary');
jest.mock('fs');

describe('uploadImageFile', () => {
  const req = {
    files: {
      image: {
        tempFilePath: '/tmp/file.png',
        size: 1024 * 1024 * 2 // 2 MB
      }
    }
  };

  const key = 'test-folder';
  const resourceType = 'image';

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it('should upload an image file successfully', async () => {
    (cloudinary.v2.uploader.upload as jest.Mock).mockResolvedValue({
      public_id: 'sample_public_id',
      secure_url: 'https://example.com/sample_image.png',
    });

    const result = await uploadImageFile(req as any, key, resourceType);

    expect(result).toEqual({
      public_id: 'sample_public_id',
      secure_url: 'https://example.com/sample_image.png',
    });
    expect(fs.unlinkSync).toHaveBeenCalledWith(req.files.image.tempFilePath);
  });

  it('should throw BadRequestError if no file is provided', async () => {
    const emptyReq = { files: {} };

    await expect(uploadImageFile(emptyReq as any, key, resourceType)).rejects.toThrow(BadRequestError);
    await expect(uploadImageFile(emptyReq as any, key, resourceType)).rejects.toThrow(`Please upload a ${key}`);
  });

  it('should throw EntityTooLarge if file size exceeds 5MB', async () => {
    req.files.image.size = 1024 * 1024 * 6; // 6 MB

    await expect(uploadImageFile(req as any, key, resourceType)).rejects.toThrow(EntityTooLarge);
    await expect(uploadImageFile(req as any, key, resourceType)).rejects.toThrow('Max size of 5mb exceeded');
  });

  it('should handle errors thrown by Cloudinary', async () => {
    (cloudinary.v2.uploader.upload as jest.Mock).mockRejectedValue(new Error('Upload failed'));

    await expect(uploadImageFile(req as any, key, resourceType)).rejects.toThrow('Upload failed');
  });
});

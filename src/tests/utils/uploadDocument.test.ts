import uploadDocument from '../../utils/uploadDocument';
import { v2 as cloudinary } from 'cloudinary';

jest.mock('cloudinary', () => ({
    v2: {
        uploader: {
            upload: jest.fn(),
        },
    },
}));

describe('uploadDocument', () => {
    const mockFile = {
        tempFilePath: 'path/to/temp/file.pdf',
    };
    const mockFolder = 'testFolder';
    const mockSecureUrl = 'https://mock.cloudinary.com/test/image/upload/v1/file.pdf';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should upload a document and return the secure URL', async () => {
        (cloudinary.uploader.upload as jest.Mock).mockResolvedValueOnce({
            secure_url: mockSecureUrl,
        });

        const result = await uploadDocument(mockFile, mockFolder);

        expect(cloudinary.uploader.upload).toHaveBeenCalledWith(mockFile.tempFilePath, {
            folder: mockFolder,
        });
        expect(result).toBe(mockSecureUrl);
    });

    it('should throw an error if the upload fails', async () => {
        const errorMessage = 'Upload failed';
        (cloudinary.uploader.upload as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

        await expect(uploadDocument(mockFile, mockFolder)).rejects.toThrow(errorMessage);

        expect(cloudinary.uploader.upload).toHaveBeenCalledWith(mockFile.tempFilePath, {
            folder: mockFolder,
        });
    });
});

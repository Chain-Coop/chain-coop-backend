import deleteDocument from '../../utils/deleteDoc';
import cloud from 'cloudinary';

// Mock Cloudinary uploader
jest.mock('cloudinary', () => ({
    v2: {
        uploader: {
            destroy: jest.fn(),
        },
    },
}));

describe('deleteDocument', () => {
    const mockDocId = 'test-doc-id';

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    it('should delete a document with valid docId', async () => {
        // Mock Cloudinary destroy to resolve successfully
        (cloud.v2.uploader.destroy as jest.Mock).mockResolvedValueOnce({ result: 'ok' });

        await deleteDocument(mockDocId);

        // Ensure the Cloudinary uploader destroy method is called with the correct document ID
        expect(cloud.v2.uploader.destroy).toHaveBeenCalledWith(mockDocId);
    });

    it('should handle errors during document deletion', async () => {
        // Mock Cloudinary destroy to throw an error
        const error = new Error('Deletion failed');
        (cloud.v2.uploader.destroy as jest.Mock).mockRejectedValueOnce(error);

        await expect(deleteDocument(mockDocId)).rejects.toThrow('Deletion failed');

        // Ensure the Cloudinary uploader destroy method was called despite the error
        expect(cloud.v2.uploader.destroy).toHaveBeenCalledWith(mockDocId);
    });
});

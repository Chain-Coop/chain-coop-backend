import deleteDocument from '../../utils/deleteDocument';
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

    it('should delete a document with a valid docId', async () => {
        // Mock the Cloudinary destroy method to resolve successfully
        (cloud.v2.uploader.destroy as jest.Mock).mockResolvedValueOnce({ result: 'ok' });

        await deleteDocument(mockDocId);

        // Check that the destroy method was called with the correct document ID
        expect(cloud.v2.uploader.destroy).toHaveBeenCalledWith(mockDocId);
    });

    it('should handle errors during document deletion', async () => {
        // Mock the Cloudinary destroy method to throw an error
        const errorMessage = 'Deletion failed';
        (cloud.v2.uploader.destroy as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

        await expect(deleteDocument(mockDocId)).rejects.toThrow(errorMessage);

        // Check that the destroy method was called even when there was an error
        expect(cloud.v2.uploader.destroy).toHaveBeenCalledWith(mockDocId);
    });
});

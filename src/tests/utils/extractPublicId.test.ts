import { extractPublicId } from '../../utils/extractPublicId';

describe('extractPublicId', () => {
    it('should extract the public ID from a valid URL', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg';
        const expectedPublicId = 'sample';

        const result = extractPublicId(url);
        expect(result).toBe(expectedPublicId); // Ensure the extracted public ID is correct
    });

    it('should return undefined for a URL without a public ID', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/';

        const result = extractPublicId(url);
        expect(result).toBeUndefined(); // No public ID present, should return undefined
    });

    it('should return undefined for an invalid URL format', () => {
        const url = 'not/a/valid/url';

        const result = extractPublicId(url);
        expect(result).toBeUndefined(); // Invalid format, should return undefined
    });

    it('should handle URLs with different file extensions', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.png';
        const expectedPublicId = 'sample';

        const result = extractPublicId(url);
        expect(result).toBe(expectedPublicId); // Ensure the extracted public ID is correct
    });

    it('should return undefined for an empty string', () => {
        const url = '';

        const result = extractPublicId(url);
        expect(result).toBeUndefined(); // Empty string should return undefined
    });
});

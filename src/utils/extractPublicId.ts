export const extractPublicId = (url: string): string | undefined => {
    const parts = url.split("/").pop()?.split(".");
    return parts ? parts[0] : undefined;
  };
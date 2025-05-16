declare module 'ln-service' {
  export function authenticatedLndGrpc(args: {
    cert: string;
    macaroon: string;
    socket: string;
  }): { lnd: any };

  export function getWalletInfo(args: { lnd: any }): Promise<any>;

  export function createChainAddress(args: {
    lnd: any;
    format: string;
  }): Promise<any>;
}
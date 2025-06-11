// services/startupService.ts
import { startInvoiceSubscription, invoiceSubscriptionService } from './invoiceSubscription';

export class StartupService {
  private static instance: StartupService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): StartupService {
    if (!StartupService.instance) {
      StartupService.instance = new StartupService();
    }
    return StartupService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Startup service already initialized');
      return;
    }

    try {
      console.log('Initializing application services...');

      // Start invoice subscription service
      const subscriptionService = startInvoiceSubscription();

      // Setup event listeners for monitoring
      subscriptionService.on('user_credited', (data) => {
        console.log(`✅ User credited:`, data);
        // You can add additional logic here like sending notifications
      });

      subscriptionService.on('processing_error', (data) => {
        console.error('❌ Invoice processing error:', data);
        // You can add error reporting/alerting here
      });

      // Graceful shutdown handling
      process.on('SIGINT', this.shutdown.bind(this));
      process.on('SIGTERM', this.shutdown.bind(this));

      this.isInitialized = true;
      console.log('✅ Application services initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize application services:', error);
      throw error;
    }
  }

  private async shutdown(): Promise<void> {
    console.log('🔄 Shutting down application services...');
    
    try {
      // Stop invoice subscription service
      invoiceSubscriptionService.stop();
      
      console.log('✅ Application services shut down successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  public getStatus(): { initialized: boolean; invoiceServiceConnected: boolean } {
    return {
      initialized: this.isInitialized,
      invoiceServiceConnected: invoiceSubscriptionService.getConnectionStatus(),
    };
  }
}

export const initializeServices = async (): Promise<void> => {
  const startupService = StartupService.getInstance();
  await startupService.initialize();
};

// Health check endpoint helper
export const getServiceHealth = () => {
  const startupService = StartupService.getInstance();
  return startupService.getStatus();
};
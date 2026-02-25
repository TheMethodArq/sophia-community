/**
 * Integration Adapter Types
 * Base interfaces for all external tool integrations
 */

export type IntegrationType = "chat" | "pm" | "knowledge" | "cicd" | "agent";

export interface IntegrationConfig {
  baseUrl: string;
  auth: {
    type: "token" | "basic" | "oauth";
    credentials: string; // Reference to env var or secure storage
  };
  options: Record<string, unknown>;
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthStatus {
  connected: boolean;
  latency: number;
  version?: string;
  error?: string;
}

export interface OperationResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Base Integration Adapter Interface
 */
export interface IntegrationAdapter {
  name: string;
  type: IntegrationType;

  // Lifecycle
  connect(config: IntegrationConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;

  // Operations (integration-specific)
  execute(operation: string, params: Record<string, unknown>): Promise<OperationResult>;
}

/**
 * Integration Manager
 * Manages all integrations and provides unified access
 */
import { getDb } from "../database.js";

export class IntegrationManager {
  private adapters = new Map<string, IntegrationAdapter>();

  /**
   * Register an integration adapter
   */
  registerAdapter(name: string, adapter: IntegrationAdapter): void {
    this.adapters.set(name, adapter);
  }

  /**
   * Get an integration adapter
   */
  getAdapter(name: string): IntegrationAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * List all registered adapters
   */
  listAdapters(): Array<{ name: string; type: IntegrationType; connected: boolean }> {
    return Array.from(this.adapters.entries()).map(([name, adapter]) => ({
      name,
      type: adapter.type,
      connected: false, // Would need to track connection state
    }));
  }

  /**
   * Run health check on all integrations
   */
  async healthCheckAll(): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};

    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch (error) {
        results[name] = {
          connected: false,
          latency: -1,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }
}

// Singleton instance
export const integrationManager = new IntegrationManager();

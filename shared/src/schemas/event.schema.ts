// shared/src/schemas/event.schema.ts

/**
 * 1. The Raw Log
 * Simulates standard application logs (e.g., from an Express or Spring Boot app).
 */
export interface RawLog {
  id: string;             // UUID
  timestamp: number;      // Unix epoch time
  service: string;        // e.g., "payment-service", "checkout-service"
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;        // e.g., "Connection refused to RDS"
  metadata?: Record<string, any>; // Flexible bucket for extra context
}

/**
 * 2. The Infrastructure Alert
 * Simulates alerts from Datadog or CloudWatch (e.g., CPU spikes).
 */
export interface Alert {
  id: string;
  timestamp: number;
  service: string;
  metric: 'CPU' | 'MEMORY' | 'LATENCY' | 'ERROR_RATE';
  value: number;          // e.g., 98.5 (percent CPU)
  threshold: number;      // e.g., 85.0 (the tripwire that caused the alert)
  status: 'FIRING' | 'RESOLVED';
}

/**
 * 3. The Enriched Incident (The output of our Correlation Engine)
 * This is the "Holy Grail" object that the War Room UI will render.
 */
export interface Incident {
  id: string;
  title: string;          // e.g., "payment-service CPU spike causing 500s"
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'RESOLVED';
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3';
  timestamp: number;      // When the incident was officially declared
  
  // The Graph: Which service actually caused this?
  rootCauseService: string; 
  
  // The Noise Reduction: Every raw event that was grouped into this single incident
  correlatedEventIds: string[]; 
  
  // The RAG AI Output: The suggested steps to fix it
  aiRunbook?: string;     
}

/**
 * 4. A Union Type for Kafka
 * When reading off the raw Kafka stream, the consumer needs to know what it's looking at.
 */
export type StreamEvent = 
  | { type: 'LOG'; payload: RawLog }
  | { type: 'ALERT'; payload: Alert };
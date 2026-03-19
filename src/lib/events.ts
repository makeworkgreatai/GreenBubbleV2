import { EventEmitter } from "events";

// Singleton event bus for broadcasting real-time updates across API routes.
// Works within a single Next.js process — perfect for ~100 concurrent users.

const globalForEvents = globalThis as unknown as { eventBus: EventEmitter };

export const eventBus = globalForEvents.eventBus || new EventEmitter();
eventBus.setMaxListeners(200); // support ~100+ concurrent SSE connections

if (process.env.NODE_ENV !== "production") {
  globalForEvents.eventBus = eventBus;
}

// Event types
export interface StatusUpdateEvent {
  type: "status_update";
  locationId: number;
  milestoneId: number;
  value: boolean;
  updatedAt: string;
  updatedByUser: { displayName: string } | null;
}

export interface BoardResetEvent {
  type: "board_reset";
}

export interface LocationChangeEvent {
  type: "location_change";
}

export type DashboardEvent = StatusUpdateEvent | BoardResetEvent | LocationChangeEvent;

export function broadcast(event: DashboardEvent) {
  eventBus.emit("dashboard", event);
}

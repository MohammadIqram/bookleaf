import logger from '../utils/logger.js';

class SseService {
  constructor() {
    /**
     * Map of client connections: clientId -> { id, user, res }
     * @type {Map<string, { id: string, user: { id: string, role: string, authorId?: string }, res: import('express').Response }>}
     */
    this.clients = new Map();

    // Start periodic heartbeat every 25 seconds to prevent browser/proxy connection timeouts
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  /**
   * Registers a new SSE connection
   *
   * @param {string} clientId
   * @param {{ id: string, role: string, authorId?: string }} user
   * @param {import('express').Response} res
   */
  addClient(clientId, user, res) {
    this.clients.set(clientId, { id: clientId, user, res });
    logger.info(`[SSE] Client connected: ${clientId} (User: ${user.email}, Role: ${user.role})`, {
      activeClients: this.clients.size,
    });

    // Send initial connected event
    this.sendEventToClient(res, 'connected', {
      clientId,
      timestamp: new Date().toISOString(),
      message: 'Connected to BookLeaf Real-Time Event Stream',
    });
  }

  /**
   * Removes a disconnected SSE client
   *
   * @param {string} clientId
   */
  removeClient(clientId) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      logger.info(`[SSE] Client disconnected: ${clientId}`, {
        activeClients: this.clients.size,
      });
    }
  }

  /**
   * Sends a formatted SSE event to a specific client response stream
   */
  sendEventToClient(res, eventName, data) {
    try {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      logger.warn(`[SSE] Failed writing to client stream: ${err.message}`);
    }
  }

  /**
   * Sends heartbeat ping comment to keep connections alive
   */
  sendHeartbeat() {
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(': keepalive\n\n');
      } catch (err) {
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Broadcasts an event to all matching clients based on role and author scope.
   * - Admins receive all ticket events.
   * - Authors receive events only if the event belongs to their authorId.
   *
   * @param {string} eventName
   * @param {object} payload
   * @param {string} [targetAuthorId=null]
   */
  broadcast(eventName, payload, targetAuthorId = null) {
    for (const [clientId, client] of this.clients.entries()) {
      const isTargetAuthor = targetAuthorId && client.user.authorId === targetAuthorId;
      const isAdmin = client.user.role === 'ADMIN';

      if (isAdmin || isTargetAuthor) {
        this.sendEventToClient(client.res, eventName, payload);
      }
    }
  }

  notifyTicketCreated(ticket) {
    this.broadcast('ticket:created', ticket, ticket.authorId);
  }

  notifyTicketUpdated(ticket) {
    this.broadcast('ticket:updated', ticket, ticket.authorId);
  }

  notifyNewMessage(message, ticket) {
    this.broadcast(
      'ticket:message',
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        message,
      },
      ticket.authorId
    );
  }
}

export const sseService = new SseService();
export default sseService;

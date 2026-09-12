import { io, Socket } from 'socket.io-client';

// Socket.IO client instance
let socket: Socket | null = null;

// Backend URL from environment variables (prioritize VITE_BACKEND_URL for WebSocket connections)
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:3001";

console.log("[Socket Client] Backend URL configured:", BACKEND_URL);

/**
 * Event payload interfaces matching the backend
 */
export interface InitiateCallData {
  patientId: string;
  doctorId: string;
}

export interface UpdateCallStatusData {
  sessionId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
}

export interface JoinQueueData {
  doctorId: string;
}

export interface CallSession {
  sessionId: string;
  patientId: string;
  doctorId: string;
  channelName: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface ActiveCallsResponse {
  doctorId: string;
  calls: CallSession[];
  count: number;
}

/**
 * Initialize Socket.IO connection with JWT authentication
 * @param token JWT token from authentication (optional for patient connections)
 * @returns Socket instance
 */
export const initializeSocket = (token?: string): Socket => {
  if (socket?.connected) {
    console.log('[Socket Client] Already connected, reusing existing socket');
    return socket;
  }

  console.log('[Socket Client] Initializing Socket.IO connection...');

  // Get token from parameter or localStorage (for staff auth)
  const authToken = token || localStorage.getItem('token') || localStorage.getItem('auth_token');

  socket = io(BACKEND_URL, {
    auth: {
      token: authToken || '', // JWT token for authentication (optional for consultation rooms)
    },
    query: {
      token: authToken || '', // Fallback token in query params
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('[Socket Client] Connected successfully:', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket Client] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket Client] Disconnected:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket Client] Reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_error', (error) => {
    console.error('[Socket Client] Reconnection error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('[Socket Client] Reconnection failed after all attempts');
  });

  return socket;
};

/**
 * Get the current Socket.IO instance
 * @returns Socket instance or null if not initialized
 */
export const getSocket = (): Socket | null => {
  if (!socket) {
    console.warn('[Socket Client] Socket not initialized. Call initializeSocket() first.');
  }
  return socket;
};

/**
 * Disconnect the Socket.IO connection
 */
export const disconnectSocket = (): void => {
  if (socket) {
    console.log('[Socket Client] Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

/**
 * Join a doctor's queue room
 * @param doctorId Doctor's user ID
 */
export const joinDoctorQueue = (doctorId: string): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  console.log('[Socket Client] Joining doctor queue:', doctorId);
  socket.emit('join_doctor_queue', { doctorId });
};

/**
 * Leave a doctor's queue room
 * @param doctorId Doctor's user ID
 */
export const leaveDoctorQueue = (doctorId: string): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  console.log('[Socket Client] Leaving doctor queue:', doctorId);
  socket.emit('leave_doctor_queue', { doctorId });
};

/**
 * Initiate a call from doctor to patient
 * @param data Call initiation data
 */
export const initiateCall = (data: InitiateCallData): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  console.log('[Socket Client] Initiating call:', data);
  socket.emit('initiate_call', data);
};

/**
 * Update call session status
 * @param data Status update data
 */
export const updateCallStatus = (data: UpdateCallStatusData): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  console.log('[Socket Client] Updating call status:', data);
  socket.emit('update_call_status', data);
};

/**
 * Get active calls for a doctor
 * @param doctorId Doctor's user ID
 */
export const getActiveCalls = (doctorId: string): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  console.log('[Socket Client] Getting active calls for doctor:', doctorId);
  socket.emit('get_active_calls', { doctorId });
};

/**
 * Send a ping to test connection
 */
export const sendPing = (): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.emit('ping');
};

/**
 * Event listener helpers
 */

/**
 * Listen for incoming call notifications (for patients)
 * @param callback Handler function
 */
export const onIncomingCall = (callback: (data: CallSession) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('incoming_call', callback);
};

/**
 * Listen for call status changes
 * @param callback Handler function
 */
export const onCallStatusChanged = (callback: (data: CallSession) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('call_status_changed', callback);
};

/**
 * Listen for queue updates (for doctors)
 * @param callback Handler function
 */
export const onQueueUpdated = (callback: (data: { type: string; payload: CallSession }) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('queue_updated', callback);
};

/**
 * Listen for active calls response
 * @param callback Handler function
 */
export const onActiveCalls = (callback: (data: ActiveCallsResponse) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('active_calls', callback);
};

/**
 * Listen for call initiation confirmation
 * @param callback Handler function
 */
export const onCallInitiated = (callback: (data: any) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('call_initiated', callback);
};

/**
 * Listen for call errors
 * @param callback Handler function
 */
export const onCallError = (callback: (data: { message: string; error?: string }) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('call_error', callback);
};

/**
 * Listen for queue joined confirmation
 * @param callback Handler function
 */
export const onQueueJoined = (callback: (data: { doctorId: string; roomName: string; message: string }) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('queue_joined', callback);
};

/**
 * Listen for pong response
 * @param callback Handler function
 */
export const onPong = (callback: (data: { timestamp: string }) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.on('pong', callback);
};

/**
 * Remove event listener
 * @param event Event name
 * @param callback Optional callback to remove (if not provided, removes all listeners for this event)
 */
export const removeListener = (event: string, callback?: (...args: any[]) => void): void => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  if (callback) {
    socket.off(event, callback);
  } else {
    socket.off(event);
  }
};

/**
 * Check if socket is connected
 * @returns true if connected, false otherwise
 */
export const isConnected = (): boolean => {
  return socket?.connected ?? false;
};

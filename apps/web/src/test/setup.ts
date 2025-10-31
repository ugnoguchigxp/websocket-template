import '@testing-library/jest-dom'

// Mock WebSocket for testing
global.WebSocket = class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.OPEN
  url = ''
  protocol = ''

  constructor(url: string, protocol?: string) {
    this.url = url
    this.protocol = protocol || ''
  }

  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
} as any

// Mock window.trpcClient
Object.defineProperty(window, 'trpcClient', {
  value: {
    wsConnection: { readyState: 1 }
  },
  writable: true
})

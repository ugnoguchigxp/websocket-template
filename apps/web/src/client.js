import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import { loggerLink } from '@trpc/client/links/loggerLink';
import superjson from 'superjson';
import { api } from './trpc';
function redact(path, input) {
    if (path === 'auth.login' && input && typeof input === 'object' && 'username' in input) {
        const { username } = input;
        return { username, password: '***' };
    }
    return input;
}
export function createTrpcClientWithToken(token) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.hostname}:3001`;
    const wsClient = createWSClient({
        url,
        WebSocket: class extends WebSocket {
            constructor(url) {
                super(url, ['bearer', token]);
            }
        },
    });
    return api.createClient({
        transformer: superjson,
        links: [
            loggerLink({ enabled: () => true }),
            wsLink({ client: wsClient }),
        ],
    });
}
export function createUnauthedTrpcClient() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.hostname}:3001`;
    const wsClient = createWSClient({ url });
    const client = createTRPCProxyClient({
        transformer: superjson,
        links: [
            loggerLink({ enabled: () => true }),
            wsLink({ client: wsClient }),
        ],
    });
    return {
        client,
        close: () => wsClient.close(),
    };
}

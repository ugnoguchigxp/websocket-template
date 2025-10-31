import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@wsfw/api/src/routers/index';

export const api = createTRPCReact<AppRouter>();

import type { PrismaClient } from '@prisma/client';
import superjson from 'superjson';
import type { OpenApiMeta } from 'trpc-openapi';
export type Context = {
    userId: string | null;
    prisma: PrismaClient;
    jwtSecret: string;
};
export declare const authed: import("@trpc/server").ProcedureBuilder<{
    _config: import("@trpc/server").RootConfig<{
        ctx: Context;
        meta: OpenApiMeta;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: typeof superjson;
    }>;
    _meta: OpenApiMeta;
    _ctx_out: {
        userId: string | null;
        prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
        jwtSecret: string;
    };
    _input_in: typeof import("@trpc/server").unsetMarker;
    _input_out: typeof import("@trpc/server").unsetMarker;
    _output_in: typeof import("@trpc/server").unsetMarker;
    _output_out: typeof import("@trpc/server").unsetMarker;
}>;
export declare const appRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: Context;
    meta: OpenApiMeta;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: typeof superjson;
}>, {
    auth: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: Context;
        meta: OpenApiMeta;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: typeof superjson;
    }>, {
        login: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: OpenApiMeta;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: typeof superjson;
            }>;
            _meta: OpenApiMeta;
            _ctx_out: {
                userId: string | null;
                prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                jwtSecret: string;
            };
            _input_in: {
                username: string;
                password: string;
            };
            _input_out: {
                username: string;
                password: string;
            };
            _output_in: {
                token: string;
            };
            _output_out: {
                token: string;
            };
        }, unknown>;
        me: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: OpenApiMeta;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: typeof superjson;
            }>;
            _meta: OpenApiMeta;
            _ctx_out: {
                userId: string | null;
                prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                jwtSecret: string;
            };
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: {
                username: string;
                id: number;
            };
            _output_out: {
                username: string;
                id: number;
            };
        }, unknown>;
    }>;
    users: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: Context;
        meta: OpenApiMeta;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: typeof superjson;
    }>, {
        get: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: OpenApiMeta;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: typeof superjson;
            }>;
            _meta: OpenApiMeta;
            _ctx_out: {
                userId: string | null;
                prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                jwtSecret: string;
            };
            _input_in: {
                id: number;
            };
            _input_out: {
                id: number;
            };
            _output_in: {
                username: string;
                id: number;
            };
            _output_out: {
                username: string;
                id: number;
            };
        }, unknown>;
        list: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: OpenApiMeta;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: typeof superjson;
            }>;
            _meta: OpenApiMeta;
            _ctx_out: {
                userId: string | null;
                prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                jwtSecret: string;
            };
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: {
                username: string;
                id: number;
            }[];
            _output_out: {
                username: string;
                id: number;
            }[];
        }, unknown>;
    }>;
    posts: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: Context;
        meta: OpenApiMeta;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: typeof superjson;
    }>, {
        list: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: OpenApiMeta;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: typeof superjson;
            }>;
            _meta: OpenApiMeta;
            _ctx_out: {
                userId: string | null;
                prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                jwtSecret: string;
            };
            _input_in: {
                cursor?: number | undefined;
                limit?: number | undefined;
            } | undefined;
            _input_out: {
                cursor?: number | undefined;
                limit?: number | undefined;
            } | undefined;
            _output_in: {
                items: {
                    id: number;
                    title: string;
                    body: string;
                    createdAt: Date;
                    author: {
                        username: string;
                        id: number;
                    };
                }[];
                nextCursor?: number | undefined;
            };
            _output_out: {
                items: {
                    id: number;
                    title: string;
                    body: string;
                    createdAt: Date;
                    author: {
                        username: string;
                        id: number;
                    };
                }[];
                nextCursor?: number | undefined;
            };
        }, unknown>;
        get: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: OpenApiMeta;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: typeof superjson;
            }>;
            _meta: OpenApiMeta;
            _ctx_out: {
                userId: string | null;
                prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                jwtSecret: string;
            };
            _input_in: {
                id: number;
            };
            _input_out: {
                id: number;
            };
            _output_in: {
                id: number;
                title: string;
                body: string;
                createdAt: Date;
                author: {
                    username: string;
                    id: number;
                };
            };
            _output_out: {
                id: number;
                title: string;
                body: string;
                createdAt: Date;
                author: {
                    username: string;
                    id: number;
                };
            };
        }, unknown>;
        create: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: OpenApiMeta;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: typeof superjson;
            }>;
            _meta: OpenApiMeta;
            _ctx_out: {
                userId: string | null;
                prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                jwtSecret: string;
            };
            _input_in: {
                title: string;
                body: string;
            };
            _input_out: {
                title: string;
                body: string;
            };
            _output_in: {
                id: number;
                title: string;
                body: string;
                createdAt: Date;
            };
            _output_out: {
                id: number;
                title: string;
                body: string;
                createdAt: Date;
            };
        }, unknown>;
        comments: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
            ctx: Context;
            meta: OpenApiMeta;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: typeof superjson;
        }>, {
            list: import("@trpc/server").BuildProcedure<"query", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: Context;
                    meta: OpenApiMeta;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: typeof superjson;
                }>;
                _meta: OpenApiMeta;
                _ctx_out: {
                    userId: string | null;
                    prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                    jwtSecret: string;
                };
                _input_in: {
                    postId: number;
                };
                _input_out: {
                    postId: number;
                };
                _output_in: {
                    id: number;
                    body: string;
                    createdAt: Date;
                    author: {
                        username: string;
                        id: number;
                    };
                }[];
                _output_out: {
                    id: number;
                    body: string;
                    createdAt: Date;
                    author: {
                        username: string;
                        id: number;
                    };
                }[];
            }, unknown>;
            add: import("@trpc/server").BuildProcedure<"mutation", {
                _config: import("@trpc/server").RootConfig<{
                    ctx: Context;
                    meta: OpenApiMeta;
                    errorShape: import("@trpc/server").DefaultErrorShape;
                    transformer: typeof superjson;
                }>;
                _meta: OpenApiMeta;
                _ctx_out: {
                    userId: string | null;
                    prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                    jwtSecret: string;
                };
                _input_in: {
                    body: string;
                    postId: number;
                };
                _input_out: {
                    body: string;
                    postId: number;
                };
                _output_in: {
                    id: number;
                    body: string;
                    createdAt: Date;
                };
                _output_out: {
                    id: number;
                    body: string;
                    createdAt: Date;
                };
            }, unknown>;
        }>;
    }>;
}>;
export type AppRouter = typeof appRouter;

export declare function processOutboxEvent(event: {
    id: string;
    topic: string;
    payload: any;
}): Promise<{
    sessionUrl: string | null;
    sessionId: string;
} | undefined>;
//# sourceMappingURL=outboxProcessor.d.ts.map
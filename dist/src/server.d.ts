import { Server } from "http";
declare class ServerCreator {
    protected server: Server;
    constructor();
    init: () => Promise<void>;
    shutdown: () => Promise<never>;
    private cleanupAndExit;
}
export default ServerCreator;
//# sourceMappingURL=server.d.ts.map
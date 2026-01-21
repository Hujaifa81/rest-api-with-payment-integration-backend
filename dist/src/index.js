import ServerCreator from "./server.js";
const server = new ServerCreator();
(async () => {
    try {
        await server.init();
    }
    catch (error) {
        console.error("Failed to start server:", error);
        await server.shutdown();
    }
})();
const gracefulShutdown = async (reason) => {
    console.log(`${reason} received, shutting down...`);
    await server.shutdown();
};
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    gracefulShutdown("unhandledRejection");
});
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
//# sourceMappingURL=index.js.map
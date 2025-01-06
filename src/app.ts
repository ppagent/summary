import { apiPlugin, config, defaultPlugin, getLogger, GlobalEventNames, PPAgent } from "ppagent";
import summaryPlugin from "./plugin.js";
import { randomUUID } from "node:crypto";

const logger = getLogger("app");

const starter = async () => {
    logger.debug("app starting");
    const chat = new PPAgent({
        name: "default",
        agentServiceOptions: {
            models: {
                bots: [],
                sources: [],
                skills: [],
                agents: [],
            },
        },
        offline: config.offline,
        taskServiceOptions: {
            tasks: [],
        },
    });
    chat.use(defaultPlugin);
    chat.use(apiPlugin);
    chat.use(summaryPlugin);
    await chat.start();
    logger.debug("app started");
    return chat;
};

const onRestart = async (chater: PPAgent) => {
    logger.warn("app restarting,stop old instance...");
    await chater.stop();
    setTimeout(async () => {
        logger.warn("old instance stopped,start new instance...");
        chater.globalEvent.emit(GlobalEventNames.APP_RESTARTED, { title: "应用重启", id: randomUUID() });
        chater.off("restart", onRestart);
        chater = await starter();
        logger.warn("new instance started");
        chater.globalEvent.on("restart", () => onRestart(chater));
    }, 500);
};

const chater = await starter();
chater.globalEvent.on("restart", () => onRestart(chater));

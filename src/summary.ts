import { IBot, ChatMessage, chatMessageRepo, getLogger, extractMessageContentText, directRunBot, SourceChatMessageType } from "ppagent";
import { In, MoreThanOrEqual } from "typeorm";

const logger = getLogger("plugin-summary-core");
export async function summary(botInstance: IBot, fromId: string, count: number, timespanInSeconds?: number, customPrompt?: string): Promise<{ summary: string; messages?: ChatMessage[] }> {
    count = count ?? 100;
    const messages = await chatMessageRepo.find({
        where:
            timespanInSeconds > 0
                ? {
                      fromId: fromId,
                      isSender: false,
                      type: In(["TEXT", "REF"]),
                      createdAt: MoreThanOrEqual(new Date().getTime() - timespanInSeconds * 1000),
                  }
                : {
                      fromId: fromId,
                      isSender: false,
                      type: In(["TEXT", "REF"]),
                  },
        order: {
            createdAt: "DESC",
        },
        take: count,
    });
    if (!messages?.length || messages.length < 5) {
        return {
            summary: "未能获取到足够的聊天记录，无法总结！",
            messages,
        };
    }
    const contents = messages
        .map((m) => {
            if (!m.senderNickName?.length) {
                logger.debug("存在没有昵称的用户，其消息将被忽略！");
                logger.trace(m);
                return "";
            }
            const text = m.text?.length ? m.text : extractMessageContentText(JSON.parse(m.raw).content); // TODO:暂时测试兼容未扩展字段，后续只使用text
            return `[${new Date(m.createdAt)}]${m.senderNickName}：${text}`;
        })
        .join("\n");
    const prompts = customPrompt
        ? `${customPrompt}\n ${contents}`
        : `你是一个中文的群聊总结的助手，你可以为一个群聊记录，提取并总结每个时间段大家在重点讨论的话题内容。

请帮我将给出的群聊内容总结成一个群聊报告，包含不多于10个的话题的总结（如果还有更多话题，可以在后面简单补充）。每个话题包含以下内容：
- 话题名(50字以内，带序号1️⃣2️⃣3️⃣，同时附带热度，以🔥数量表示）
- 参与者(不超过5个人，将重复的人名去重)
- 时间段(从几点到几点)
- 过程(50到200字左右）
- 评价(50字以下)
- 分割线： ------------

另外有以下要求：
1. 每个话题结束使用 ------------ 分割
2. 使用中文冒号
3. 无需大标题
4. 开始给出本群讨论风格的整体评价，例如活跃、太水、太黄、太暴力、话题不集中、无聊诸如此类

最后总结下今日最活跃的前五个发言者。

以下是群聊内容：

${contents}

`;

    const res = await directRunBot(botInstance, SourceChatMessageType.TEXT, prompts);
    return { summary: res.text, messages };
}

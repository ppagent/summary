import { chatMessageRepo, getLogger, extractMessageContentText } from "ppagent";
import { In, MoreThanOrEqual } from "typeorm";

const logger = getLogger("plugin-summary-core");
export async function getSummaryPrompts(fromId: string, count: number, timespanInSeconds?: number, customPrompt?: string): Promise<{ prompts?: string; error?: string }> {
    try {
        count = count ?? 100;
        if (count > 500) {
            logger.warn(`summary count is too large, will be clipped to 500`);
            count = 500;
        }
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
                createdAt: "ASC",
            },
            take: count,
        });
        if (!messages?.length || messages.length < 5) {
            return {
                error: `找到了${messages?.length}条消息记录，无法总结！`,
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
 话题名(50字以内，附带热度，以🔥的数量表示）
 参与者(不超过5个人，将重复的人名去重) 
 时间段(从几点到几点) 
 过程(50到200字左右） 
 评价(50字以下) 
另外有以下要求：
1. 每个话题以及话题内部的四个小点参与者、时间段、过程、评价结束使用换行分割
2. 使用中文冒号
3. 无需大标题
4. 开始给出本群讨论风格的整体评价，例如活跃、太水、太黄、太暴力、话题不集中、无聊诸如此类
5. 请严格遵守以下示例中的文字格式，包括换行。

最后换行，总结下今日最活跃的前五个发言者。
===============
回答示例如下：

整体评价：xxxxxxx

话题总结：

✨️xxx 🔥🔥🔥：
    1️⃣参与者：xxx。
    2️⃣时间段：xxx。
    3️⃣过程：xxx。
    4️⃣评价：xxx。


✨️xxx 🔥🔥🔥：
    1️⃣参与者：xxx。
    2️⃣时间段：xxx。
    3️⃣过程：xxx。
    4️⃣评价：xxx。

...

今日最活跃的前五个发言者是 xxxx。

示例结束。
================
以下是群聊内容：

${contents}

`;
        return {
            prompts,
        };
    } catch (error: any) {
        logger.error(error.message);
        return {
            error: error.message,
        };
    }
}

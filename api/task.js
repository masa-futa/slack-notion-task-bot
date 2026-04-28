const { verifySlackRequest, parseTaskCommand } = require('../lib/slack');
const { createTask, formatTask } = require('../lib/notion');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Slack署名を検証
  if (!verifySlackRequest(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = new URLSearchParams(req.body);
  const text = body.get('text') || '';
  const userId = body.get('user_id');
  const userName = body.get('user_name');

  if (!text) {
    return res.status(200).json({
      response_type: 'ephemeral',
      text: '❌ タスク名を入力してください\n使い方: `/task タスク名 @優先度 #カテゴリ due:期限`',
    });
  }

  try {
    // コマンドをパース
    const { taskName, priority, category, dueDate } = parseTaskCommand(text);

    if (!taskName) {
      return res.status(200).json({
        response_type: 'ephemeral',
        text: '❌ タスク名を入力してください',
      });
    }

    // Notionにタスクを追加
    const task = await createTask({
      title: taskName,
      priority: priority || '中',
      category,
      dueDate,
    });

    // 成功メッセージ
    const formattedTask = formatTask(task);
    
    return res.status(200).json({
      response_type: 'in_channel',
      text: `✅ タスクを追加しました\n${formattedTask}`,
    });

  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(200).json({
      response_type: 'ephemeral',
      text: `❌ エラーが発生しました: ${error.message}`,
    });
  }
};

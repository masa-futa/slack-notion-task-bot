const { verifySlackRequest } = require('../lib/slack');
const { completeTask, formatTask } = require('../lib/notion');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Slack署名を検証
  if (!verifySlackRequest(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = new URLSearchParams(req.body);
  const searchTerm = body.get('text') || '';

  if (!searchTerm) {
    return res.status(200).json({
      response_type: 'ephemeral',
      text: '❌ タスク名を入力してください\n使い方: `/done タスク名（部分一致）`',
    });
  }

  try {
    // タスクを完了
    const completedTask = await completeTask(searchTerm);

    if (!completedTask) {
      return res.status(200).json({
        response_type: 'ephemeral',
        text: `❌ 「${searchTerm}」に一致するタスクが見つかりませんでした`,
      });
    }

    const formatted = formatTask(completedTask);

    return res.status(200).json({
      response_type: 'in_channel',
      text: `✅ タスクを完了しました！\n${formatted}`,
    });

  } catch (error) {
    console.error('Error completing task:', error);
    return res.status(200).json({
      response_type: 'ephemeral',
      text: `❌ エラーが発生しました: ${error.message}`,
    });
  }
};

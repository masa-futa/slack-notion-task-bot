const { verifySlackRequest } = require('../lib/slack');
const { getTasks, formatTask } = require('../lib/notion');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Slack署名を検証
  if (!verifySlackRequest(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = new URLSearchParams(req.body);
  const filter = body.get('text') || null;

  try {
    // タスクを取得
    const tasks = await getTasks(filter);

    if (tasks.length === 0) {
      const filterText = filter ? ` (フィルター: ${filter})` : '';
      return res.status(200).json({
        response_type: 'ephemeral',
        text: `📋 タスクはありません${filterText}`,
      });
    }

    // タスクを優先度別にグループ化
    const groupedTasks = {
      '🔴 高': [],
      '🟡 中': [],
      '🟢 低': [],
    };

    for (const task of tasks) {
      const priority = task.properties['優先度']?.select?.name || '🟡 中';
      const formatted = formatTask(task);
      
      if (priority.includes('高')) {
        groupedTasks['🔴 高'].push(formatted);
      } else if (priority.includes('中')) {
        groupedTasks['🟡 中'].push(formatted);
      } else {
        groupedTasks['🟢 低'].push(formatted);
      }
    }

    // メッセージを構築
    const filterText = filter ? ` (フィルター: ${filter})` : '';
    let message = `📋 タスク一覧${filterText} (${tasks.length}件)\n\n`;

    for (const [priority, taskList] of Object.entries(groupedTasks)) {
      if (taskList.length > 0) {
        message += `${priority}\n`;
        for (const task of taskList) {
          message += `• ${task}\n`;
        }
        message += '\n';
      }
    }

    return res.status(200).json({
      response_type: 'ephemeral',
      text: message.trim(),
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(200).json({
      response_type: 'ephemeral',
      text: `❌ エラーが発生しました: ${error.message}`,
    });
  }
};

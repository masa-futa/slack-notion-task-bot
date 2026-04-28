const crypto = require('crypto');

function verifySlackRequest(req) {
  const slackSignature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!slackSignature || !timestamp) {
    return false;
  }

  // タイムスタンプチェック（5分以内）
  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    return false;
  }

  // 署名を検証
  const sigBasestring = `v0:${timestamp}:${req.body}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(slackSignature, 'utf8')
  );
}

function parseTaskCommand(text) {
  const parts = text.trim().split(/\s+/);
  let taskName = '';
  let priority = null;
  let category = null;
  let dueDate = null;

  for (const part of parts) {
    if (part.startsWith('@')) {
      // 優先度
      priority = part.substring(1);
    } else if (part.startsWith('#')) {
      // カテゴリ
      category = part.substring(1);
    } else if (part.startsWith('due:')) {
      // 期限
      const duePart = part.substring(4);
      if (duePart === '今日' || duePart === 'today') {
        dueDate = new Date().toISOString().split('T')[0];
      } else if (duePart === '明日' || duePart === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString().split('T')[0];
      } else if (duePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dueDate = duePart;
      } else {
        // 曜日指定（月曜、火曜など）
        const dayMap = {
          '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0,
          'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0,
        };
        const day = dayMap[duePart.replace(/曜$/, '')];
        if (day !== undefined) {
          const target = new Date();
          const currentDay = target.getDay();
          const diff = (day - currentDay + 7) % 7 || 7;
          target.setDate(target.getDate() + diff);
          dueDate = target.toISOString().split('T')[0];
        }
      }
    } else {
      // タスク名
      taskName += (taskName ? ' ' : '') + part;
    }
  }

  return { taskName, priority, category, dueDate };
}

module.exports = {
  verifySlackRequest,
  parseTaskCommand,
};

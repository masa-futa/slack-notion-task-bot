const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// 優先度マッピング
const PRIORITY_MAP = {
  '高': '🔴 高',
  '中': '🟡 中',
  '低': '🟢 低',
  'high': '🔴 高',
  'medium': '🟡 中',
  'low': '🟢 低',
};

// カテゴリマッピング
const CATEGORY_MAP = {
  '学習': '📚 学習',
  '開発': '💻 開発',
  '生活': '🏠 生活',
  '趣味': '🎨 趣味',
  'study': '📚 学習',
  'dev': '💻 開発',
  'life': '🏠 生活',
  'hobby': '🎨 趣味',
};

// タスクを追加
async function createTask({ title, priority = '中', category = null, dueDate = null }) {
  const properties = {
    'Name': {
      title: [{ text: { content: title } }],
    },
    'ステータス': {
      select: { name: 'TODO' },
    },
    '優先度': {
      select: { name: PRIORITY_MAP[priority] || '🟡 中' },
    },
  };

  if (category && CATEGORY_MAP[category]) {
    properties['カテゴリ'] = {
      select: { name: CATEGORY_MAP[category] },
    };
  }

  if (dueDate) {
    properties['期限'] = {
      date: { start: dueDate },
    };
  }

  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });

  return response;
}

// タスク一覧を取得
async function getTasks(filter = null) {
  let notionFilter = {
    property: 'ステータス',
    select: { does_not_equal: '完了' },
  };

  // フィルター適用
  if (filter) {
    if (filter === '高' || filter === '中' || filter === '低') {
      notionFilter = {
        and: [
          notionFilter,
          {
            property: '優先度',
            select: { equals: PRIORITY_MAP[filter] },
          },
        ],
      };
    } else if (CATEGORY_MAP[filter]) {
      notionFilter = {
        and: [
          notionFilter,
          {
            property: 'カテゴリ',
            select: { equals: CATEGORY_MAP[filter] },
          },
        ],
      };
    } else if (filter === '今日') {
      const today = new Date().toISOString().split('T')[0];
      notionFilter = {
        and: [
          notionFilter,
          {
            property: '期限',
            date: { equals: today },
          },
        ],
      };
    }
  }

  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: notionFilter,
    sorts: [
      { property: '優先度', direction: 'ascending' },
      { property: '期限', direction: 'ascending' },
    ],
  });

  return response.results;
}

// タスクを完了
async function completeTask(searchTerm) {
  // まず該当タスクを検索
  const allTasks = await getTasks();
  const matchedTask = allTasks.find(task => {
    const title = task.properties.Name.title[0]?.plain_text || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!matchedTask) {
    return null;
  }

  // ステータスを「完了」に更新
  await notion.pages.update({
    page_id: matchedTask.id,
    properties: {
      'ステータス': {
        select: { name: '完了' },
      },
      '完了日': {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  });

  return matchedTask;
}

// タスクをフォーマット
function formatTask(task) {
  const title = task.properties.Name.title[0]?.plain_text || '無題';
  const priority = task.properties['優先度']?.select?.name || '';
  const category = task.properties['カテゴリ']?.select?.name || '';
  const dueDate = task.properties['期限']?.date?.start || '';

  let emoji = '';
  if (priority.includes('高')) emoji = '🔴';
  else if (priority.includes('中')) emoji = '🟡';
  else if (priority.includes('低')) emoji = '🟢';

  let text = `${emoji} ${title}`;
  
  if (category) {
    text += ` ${category}`;
  }
  
  if (dueDate) {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dueDate === today.toISOString().split('T')[0]) {
      text += ' (期限: 今日)';
    } else if (dueDate === tomorrow.toISOString().split('T')[0]) {
      text += ' (期限: 明日)';
    } else {
      text += ` (期限: ${dueDate})`;
    }
  }

  return text;
}

module.exports = {
  createTask,
  getTasks,
  completeTask,
  formatTask,
};

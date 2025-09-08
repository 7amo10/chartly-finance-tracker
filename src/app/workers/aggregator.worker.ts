// Web Worker to compute monthly and category aggregates
addEventListener('message', (ev) => {
  const msg = ev.data;
  if (!msg || msg.action !== 'rebuild') return;
  const txs: any[] = msg.transactions || [];
  const monthsMap = new Map();
  const catMap = new Map();
  const total = txs.length;
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    if (t.deletedAt) continue;
    const month = (typeof t.date === 'string') ? t.date.slice(0,7) : (new Date(t.date)).toISOString().slice(0,7);
    if (!monthsMap.has(month)) monthsMap.set(month, { month, income: 0, expense: 0 });
    if (t.type === 'income') monthsMap.get(month).income += Number(t.amount || 0);
    if (t.type === 'expense') monthsMap.get(month).expense += Number(t.amount || 0);
    if (t.type === 'expense') {
      const cid = t.categoryId ? Number(t.categoryId) : 0;
      catMap.set(cid, (catMap.get(cid) || 0) + Number(t.amount || 0));
    }
    if (i % 100 === 0) {
      postMessage({ type: 'progress', pct: Math.floor((i/total)*100) });
    }
  }
  const months = Array.from(monthsMap.values()).sort((a,b)=>a.month.localeCompare(b.month));
  const categories = Array.from(catMap.entries()).map(([categoryId, amount]) => ({ categoryId: Number(categoryId), amount }));
  postMessage({ type: 'result', months, categories });
});

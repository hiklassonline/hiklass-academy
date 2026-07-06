import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function buildResults(query, dataSources) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results = [];

  if (dataSources.courses) {
    for (const c of dataSources.courses) {
      if ((c.title || '').toLowerCase().includes(q)) {
        results.push({ id: c.id || c.title, type: 'course', title: c.title, subtitle: c.category || '', route: '/admin/courses' });
      }
    }
  }

  if (dataSources.packages) {
    for (const p of dataSources.packages) {
      if ((p.name || '').toLowerCase().includes(q)) {
        results.push({ id: p.id || p.name, type: 'package', title: p.name, subtitle: `${formatPriceSimple(p.price)}`, route: '/admin/packages' });
      }
    }
  }

  if (dataSources.orders) {
    for (const o of dataSources.orders) {
      if ((o.name || '').toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q)) {
        results.push({ id: o.id, type: 'enrollment', title: o.name, subtitle: o.email + ' - ' + (o.totalAmount ? formatPriceSimple(o.totalAmount) : ''), route: '/admin/enrollments' });
      }
    }
  }

  if (dataSources.students) {
    for (const s of dataSources.students) {
      if ((s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)) {
        results.push({ id: s.id || s.email, type: 'student', title: s.name, subtitle: s.email, route: '/admin/students' });
      }
    }
  }

  if (dataSources.payments) {
    for (const p of dataSources.payments) {
      if ((p.id || '').toLowerCase().includes(q) || (p.method || '').toLowerCase().includes(q)) {
        results.push({ id: p.id, type: 'payment', title: p.id, subtitle: `${p.method} - ${formatPriceSimple(p.amount)}`, route: '/admin/payments' });
      }
    }
  }

  if (dataSources.messages) {
    for (const m of dataSources.messages) {
      if ((m.name || '').toLowerCase().includes(q) || (m.message || '').toLowerCase().includes(q)) {
        results.push({ id: m.id, type: 'message', title: m.name, subtitle: (m.message || '').slice(0, 60), route: '/admin/messages' });
      }
    }
  }

  return results.slice(0, 20);
}

function formatPriceSimple(value) {
  return `${Number(value || 0).toLocaleString('en-US')} FCFA`;
}

const typeIcons = {
  course: '📚',
  package: '📦',
  enrollment: '📝',
  student: '👤',
  payment: '💳',
  message: '💬',
};

export default function useGlobalSearch(dataSources) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const ref = useRef(null);
  const dataSourcesRef = useRef(dataSources);
  dataSourcesRef.current = dataSources;

  const debouncedSearch = useMemo(() => debounce((q) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = buildResults(q, dataSourcesRef.current);
      setResults(res);
    } catch {}
    setSearching(false);
  }, 400), []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setOpen(true);
    setSearching(true);
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    for (const r of results) {
      if (!g[r.type]) g[r.type] = [];
      g[r.type].push(r);
    }
    return g;
  }, [results]);

  const typeLabels = { course: 'Courses', package: 'Packages', enrollment: 'Enrollments', student: 'Students', payment: 'Payments', message: 'Messages' };

  return { query, setQuery, results, grouped, open, setOpen, searching, ref, typeLabels, typeIcons };
}
